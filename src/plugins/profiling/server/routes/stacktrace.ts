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
const frameIDToFileIDCache = new LRUCache<string, FileID>({ max: 100000 });

// convertFrameIDToFileID extracts the FileID from the FrameID and returns as base64url string.
export function extractFileIDFromFrameID(frameID: string): string {
  const fileIDChunk = frameID.slice(0, 23);
  let fileID = frameIDToFileIDCache.get(fileIDChunk) as string;
  if (fileID) return fileID;

  // Step 1: Convert the base64-encoded frameID to an array of 22 bytes.
  // We use 'base64url' instead of 'base64' because frameID is encoded URL-friendly.
  // The first 16 bytes contain the FileID.
  const buf = Buffer.from(fileIDChunk, 'base64url');

  // Convert the FileID bytes into base64 with URL-friendly encoding.
  // We have to manually append '==' since we use the FileID string for
  // comparing / looking up the FileID strings in the ES indices, which have
  // the '==' appended.
  // We may want to remove '==' in the future to reduce the uncompressed storage size by 10%.
  fileID = buf.toString('base64url', 0, 16) + '==';
  frameIDToFileIDCache.set(fileIDChunk, fileID);
  return fileID;
}

// extractFileIDArrayFromFrameIDArray extracts all FileIDs from the array of FrameIDs
// and returns them as an array of base64url encoded strings. The order of this array
// corresponds to the order of the input array.
function extractFileIDArrayFromFrameIDArray(frameIDs: string[]): string[] {
  const fileIDs = Array<string>(frameIDs.length);
  for (let i = 0; i < frameIDs.length; i++) {
    fileIDs[i] = extractFileIDFromFrameID(frameIDs[i]);
  }
  return fileIDs;
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
      const frameIDs = trace.fields.FrameID as string[];
      const fileIDs = extractFileIDArrayFromFrameIDArray(frameIDs);
      stackTraces.set(trace._id, {
        FileID: fileIDs,
        FrameID: frameIDs,
        Type: trace.fields.Type,
      });
      for (const frameID of frameIDs) {
        stackFrameDocIDs.add(frameID);
      }
      for (const fileID of fileIDs) {
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
            const frameIDs = trace._source.FrameID as string[];
            stackTrace = {
              FileID: extractFileIDArrayFromFrameIDArray(frameIDs),
              FrameID: frameIDs,
              Type: trace._source.Type,
            };
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
  await logExecutionLatency(logger, 'processing data', async () => {
    const docs = getDocs(resExecutables);
    for (const exe of docs) {
      if (exe.found) {
        executables.set(exe._id, exe._source);
      } else {
        executables.set(exe._id, {
          FileName: '',
        });
      }
    }
  });

  return executables;
}
