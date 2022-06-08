/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chunk } from 'lodash';
import LRUCache from 'lru-cache';
import type { ElasticsearchClient, Logger } from 'kibana/server';
import {
  Executable,
  FileID,
  StackFrame,
  StackFrameID,
  StackTrace,
  StackTraceID,
} from '../../common/profiling';
import { logExecutionLatency } from './logger';
import { getHitsItems, getDocs } from './compat';

const traceLRU = new LRUCache<StackTraceID, StackTrace>({ max: 20000 });
const fileIDChunkToFileIDCache = new LRUCache<string, FileID>({ max: 100000 });

const BASE64_FILE_ID_LENGTH = 22;
const BASE64_FRAME_ID_LENGTH = 32;

export interface EncodedStackTrace {
  // This field is a base64-encoded byte string. The string represents a
  // serialized list of frame IDs in which the order of frames are
  // reversed to allow for prefix compression (leaf frame last). Each
  // frame ID is composed of two concatenated values: a 16-byte file ID
  // and an 8-byte address or line number (depending on the context of
  // the downstream reader).
  //
  //         Frame ID #1               Frame ID #2
  // +----------------+--------+----------------+--------+----
  // |     File ID    |  Addr  |     File ID    |  Addr  |
  // +----------------+--------+----------------+--------+----
  FrameID: string;

  // This field is a run-length encoding of a list of uint8s. The order is
  // reversed from the original input.
  Type: string;
}

// runLengthEncodeReverse encodes the reversed input array using a
// run-length encoding.
//
// The input is a list of uint8s. The output is a binary stream of
// 2-byte pairs (first byte is the length and the second byte is the
// binary representation of the object) in reverse order.
//
// E.g. uint8 array [2, 2, 0, 0, 0, 0, 0] is converted into the byte
// array [5, 0, 2, 2].
export function runLengthEncodeReverse(input: number[]): Buffer {
  const output: number[] = [];

  if (input.length === 0) {
    return Buffer.from(output);
  }

  let count = 0;
  let current = input[input.length - 1];

  for (let i = input.length - 2; i >= 0; i--) {
    const next = input[i];

    if (next === current && count < 255) {
      count++;
      continue;
    }

    output.push(count + 1, current);

    count = 0;
    current = next;
  }

  output.push(count + 1, current);

  return Buffer.from(output);
}

// runLengthDecodeReverse decodes a run-length encoding for the reversed input array.
//
// The input is a binary stream of 2-byte pairs (first byte is the length and the
// second byte is the binary representation of the object). The output is a list of
// uint8s in reverse order.
//
// E.g. byte array [5, 0, 2, 2] is converted into an uint8 array like
// [2, 2, 0, 0, 0, 0, 0].
export function runLengthDecodeReverse(input: Buffer, outputSize?: number): number[] {
  let size;

  if (typeof outputSize === 'undefined') {
    size = 0;
    for (let i = 0; i < input.length; i += 2) {
      size += input[i];
    }
  } else {
    size = outputSize;
  }

  const output: number[] = new Array(size);

  let idx = 0;
  for (let i = input.length - 1; i >= 1; i -= 2) {
    for (let j = 0; j < input[i - 1]; j++) {
      output[idx] = input[i];
      idx++;
    }
  }

  return output;
}

// decodeStackTrace unpacks an encoded stack trace from Elasticsearch
export function decodeStackTrace(input: EncodedStackTrace): StackTrace {
  const countsFrameIDs = input.FrameID.length / BASE64_FRAME_ID_LENGTH;
  const fileIDs: string[] = new Array(countsFrameIDs);
  const frameIDs: string[] = new Array(countsFrameIDs);

  // Step 1: Convert the base64-encoded frameID list into two separate
  // lists (frame IDs and file IDs), both of which are also base64-encoded.
  //
  // To get the frame ID, we grab the next 32 bytes.
  //
  // To get the file ID, we grab the first 22 bytes of the frame ID.
  // However, since the file ID is base64-encoded using 21.33 bytes
  // (16 * 4 / 3), then the 22 bytes have an extra 4 bits from the
  // address (see diagram in definition of EncodedStackTrace).
  for (let i = 0; i < input.FrameID.length; i += BASE64_FRAME_ID_LENGTH) {
    const frameID = input.FrameID.slice(i, i + BASE64_FRAME_ID_LENGTH);
    const fileIDChunk = frameID.slice(0, BASE64_FILE_ID_LENGTH);
    const fileID = fileIDChunkToFileIDCache.get(fileIDChunk) as string;
    const j = countsFrameIDs - Math.floor(i / BASE64_FRAME_ID_LENGTH) - 1;

    frameIDs[j] = frameID;

    if (fileID) {
      fileIDs[j] = fileID;
    } else {
      const buf = Buffer.from(fileIDChunk, 'base64url');

      // We have to manually append '==' since we use the FileID string for
      // comparing / looking up the FileID strings in the ES indices, which have
      // the '==' appended.
      //
      // We may want to remove '==' in the future to reduce the uncompressed
      // storage size by 10%.
      fileIDs[j] = buf.toString('base64url', 0, 16) + '==';
      fileIDChunkToFileIDCache.set(fileIDChunk, fileIDs[j]);
    }
  }

  // Step 2: Convert the run-length byte encoding into a list of uint8s.
  const types = Buffer.from(input.Type, 'base64url');
  const typeIDs = runLengthDecodeReverse(types, countsFrameIDs);

  return {
    FileID: fileIDs,
    FrameID: frameIDs,
    Type: typeIDs,
  } as StackTrace;
}

export async function searchStackTraces(
  logger: Logger,
  client: ElasticsearchClient,
  events: Map<StackTraceID, number>,
  concurrency: number = 1
) {
  const stackTraceIDs = [...events.keys()];
  const chunkSize = Math.floor(events.size / concurrency);
  let chunks = chunk(stackTraceIDs, chunkSize);

  if (chunks.length !== concurrency) {
    // The last array element contains the remainder, just drop it as irrelevant.
    chunks = chunks.slice(0, concurrency);
  }

  const stackResponses = await logExecutionLatency(
    logger,
    'search query for ' + events.size + ' stacktraces',
    async () => {
      return await Promise.all(
        chunks.map((ids) => {
          return client.search(
            {
              index: 'profiling-stacktraces',
              size: events.size,
              sort: '_doc',
              query: {
                ids: {
                  values: [...ids],
                },
              },
              _source: false,
              docvalue_fields: ['FrameID', 'Type'],
            },
            {
              querystring: {
                filter_path: 'hits.hits._id,hits.hits.fields.FrameID,hits.hits.fields.Type',
                pre_filter_shard_size: 1,
              },
            }
          );
        })
      );
    }
  );

  const stackTraces = new Map<StackTraceID, StackTrace>();
  const stackFrameDocIDs = new Set<string>(); // Set of unique FrameIDs
  const executableDocIDs = new Set<string>(); // Set of unique executable FileIDs.

  await logExecutionLatency(logger, 'processing data', async () => {
    const traces = stackResponses.flatMap((response) => getHitsItems(response));
    for (const trace of traces) {
      const stackTrace = decodeStackTrace(trace.fields as EncodedStackTrace);
      stackTraces.set(trace._id, stackTrace);
      for (const frameID of stackTrace.FrameID) {
        stackFrameDocIDs.add(frameID);
      }
      for (const fileID of stackTrace.FileID) {
        executableDocIDs.add(fileID);
      }
    }
  });

  if (stackTraces.size < events.size) {
    logger.info(
      'failed to find ' + (events.size - stackTraces.size) + ' stacktraces (todo: find out why)'
    );
  }

  return { stackTraces, stackFrameDocIDs, executableDocIDs };
}

export async function mgetStackTraces(
  logger: Logger,
  client: ElasticsearchClient,
  events: Map<StackTraceID, number>,
  concurrency: number = 1
) {
  const stackTraceIDs = [...events.keys()];
  const chunkSize = Math.floor(events.size / concurrency);
  let chunks = chunk(stackTraceIDs, chunkSize);

  if (chunks.length !== concurrency) {
    // The last array element contains the remainder, just drop it as irrelevant.
    chunks = chunks.slice(0, concurrency);
  }

  const stackResponses = await logExecutionLatency(
    logger,
    'mget query (' + concurrency + ' parallel) for ' + events.size + ' stacktraces',
    async () => {
      return await Promise.all(
        chunks.map((ids) => {
          return client.mget({
            index: 'profiling-stacktraces',
            ids,
            realtime: false,
            _source_includes: ['FrameID', 'Type'],
          });
        })
      );
    }
  );

  let totalFrames = 0;
  const stackTraces = new Map<StackTraceID, StackTrace>();
  const stackFrameDocIDs = new Set<string>(); // Set of unique FrameIDs
  const executableDocIDs = new Set<string>(); // Set of unique executable FileIDs.

  await logExecutionLatency(logger, 'processing data', async () => {
    // flatMap() is significantly slower than an explicit for loop
    for (const res of stackResponses) {
      for (const trace of getDocs(res)) {
        // Sometimes we don't find the trace.
        // This is due to ES delays writing (data is not immediately seen after write).
        // Also, ES doesn't know about transactions.
        if (trace.found) {
          const traceid = trace._id as StackTraceID;
          let stackTrace = traceLRU.get(traceid) as StackTrace;
          if (!stackTrace) {
            stackTrace = decodeStackTrace(trace._source as EncodedStackTrace);
            traceLRU.set(traceid, stackTrace);
          }

          totalFrames += stackTrace.FrameID.length;
          stackTraces.set(traceid, stackTrace);
          for (const frameID of stackTrace.FrameID) {
            stackFrameDocIDs.add(frameID);
          }
          for (const fileID of stackTrace.FileID) {
            executableDocIDs.add(fileID);
          }
        }
      }
    }
  });

  if (stackTraces.size !== 0) {
    logger.info('Average size of stacktrace: ' + totalFrames / stackTraces.size);
  }

  if (stackTraces.size < events.size) {
    logger.info(
      'failed to find ' + (events.size - stackTraces.size) + ' stacktraces (todo: find out why)'
    );
  }

  return { stackTraces, stackFrameDocIDs, executableDocIDs };
}

export async function mgetStackFrames(
  logger: Logger,
  client: ElasticsearchClient,
  stackFrameIDs: Set<string>
): Promise<Map<StackFrameID, StackFrame>> {
  const stackFrames = new Map<StackFrameID, StackFrame>();

  if (stackFrameIDs.size === 0) {
    return stackFrames;
  }

  const resStackFrames = await logExecutionLatency(
    logger,
    'mget query for ' + stackFrameIDs.size + ' stackframes',
    async () => {
      return await client.mget({
        index: 'profiling-stackframes',
        ids: [...stackFrameIDs],
        realtime: false,
      });
    }
  );

  // Create a lookup map StackFrameID -> StackFrame.
  let framesFound = 0;
  await logExecutionLatency(logger, 'processing data', async () => {
    const docs = getDocs(resStackFrames);
    for (const frame of docs) {
      if (frame.found) {
        stackFrames.set(frame._id, frame._source);
        framesFound++;
      } else {
        stackFrames.set(frame._id, {
          FileName: '',
          FunctionName: '',
          FunctionOffset: 0,
          LineNumber: 0,
          SourceType: 0,
        });
      }
    }
  });

  logger.info('found ' + framesFound + ' / ' + stackFrameIDs.size + ' frames');

  return stackFrames;
}

export async function mgetExecutables(
  logger: Logger,
  client: ElasticsearchClient,
  executableIDs: Set<string>
): Promise<Map<FileID, Executable>> {
  const executables = new Map<FileID, Executable>();

  if (executableIDs.size === 0) {
    return executables;
  }

  const resExecutables = await logExecutionLatency(
    logger,
    'mget query for ' + executableIDs.size + ' executables',
    async () => {
      return await client.mget<any>({
        index: 'profiling-executables',
        ids: [...executableIDs],
        _source_includes: ['FileName'],
      });
    }
  );

  // Create a lookup map StackFrameID -> StackFrame.
  let exeFound = 0;
  await logExecutionLatency(logger, 'processing data', async () => {
    const docs = getDocs(resExecutables);
    for (const exe of docs) {
      if (exe.found) {
        executables.set(exe._id, exe._source);
        exeFound++;
      } else {
        executables.set(exe._id, {
          FileName: '',
        });
      }
    }
  });

  logger.info('found ' + exeFound + ' / ' + executableIDs.size + ' executables');

  return executables;
}
