/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import type { FrameType } from '@kbn/profiling-utils';

export const STACKTRACES_INDEX = 'profiling-stacktraces';
export const STACKFRAMES_INDEX = 'profiling-stackframes';
export const EXECUTABLES_INDEX = 'profiling-executables';

const FILE_ID_BYTES = 16;
const ADDRESS_OR_LINE_BYTES = 8;
const STACKTRACE_ID_BYTES = 16;
const MAX_FRAME_TYPE_RUN_LENGTH = 255;

export interface UniversalProfilingMetadataDocument {
  index: string;
  id: string;
  document: object;
}

export interface UniversalProfilingFrame {
  type: FrameType;
  functionName: string;
  /** Binary that contains the frame. Native and kernel frames set it, interpreted frames don't. */
  executable?: string;
  fileName?: string;
  lineNumber?: number;
}

export interface UniversalProfilingCallTree {
  frame: UniversalProfilingFrame;
  /** Relative number of samples in which this frame is the leaf of the stack. */
  selfWeight?: number;
  children?: UniversalProfilingCallTree[];
}

export interface UniversalProfilingStackTrace {
  id: string;
  /** Relative number of samples of the stack trace. */
  weight: number;
  /** Stacktrace, stackframes and executables documents of the stack trace. */
  documents: UniversalProfilingMetadataDocument[];
}

const hash = (value: string, bytes: number): Buffer =>
  createHash('sha256').update(value).digest().subarray(0, bytes);

// The agent hashes the file contents; hashing the name keeps the IDs stable across runs.
const getFileId = ({ executable, fileName, functionName }: UniversalProfilingFrame): Buffer =>
  hash(executable ?? fileName ?? functionName, FILE_ID_BYTES);

// A frame ID is the file ID followed by the address (native frames) or line (interpreted frames).
const getFrameId = (frame: UniversalProfilingFrame): string =>
  Buffer.concat([
    getFileId(frame),
    hash(`${frame.functionName}:${frame.lineNumber ?? ''}`, ADDRESS_OR_LINE_BYTES),
  ]).toString('base64url');

// Frame types are run-length encoded as (count, type) byte pairs.
const encodeFrameTypes = (types: FrameType[]): string => {
  const runs: Array<[count: number, type: FrameType]> = [];

  for (const type of types) {
    const lastRun = runs[runs.length - 1];

    if (lastRun && lastRun[1] === type && lastRun[0] < MAX_FRAME_TYPE_RUN_LENGTH) {
      lastRun[0]++;
    } else {
      runs.push([1, type]);
    }
  }

  return Buffer.from(runs.flat()).toString('base64url');
};

const getStackframeDocument = ({
  functionName,
  fileName,
  lineNumber,
}: UniversalProfilingFrame) => ({
  'Stackframe.function.name': functionName,
  ...(fileName ? { 'Stackframe.file.name': fileName } : {}),
  ...(lineNumber !== undefined ? { 'Stackframe.line.number': lineNumber } : {}),
});

/** Creates the documents of a stack trace, given its frames ordered from the root to the leaf. */
export const createUniversalProfilingStackTrace = (
  frames: UniversalProfilingFrame[],
  weight: number = 1
): UniversalProfilingStackTrace => {
  const frameIds = frames.map(getFrameId);
  const id = hash(frameIds.join(''), STACKTRACE_ID_BYTES).toString('base64url');

  const stacktrace: UniversalProfilingMetadataDocument = {
    index: STACKTRACES_INDEX,
    id,
    document: {
      'Stacktrace.frame.ids': frameIds.join(''),
      'Stacktrace.frame.types': encodeFrameTypes(frames.map(({ type }) => type)),
    },
  };

  const stackframes = frames.map(
    (frame, frameIndex): UniversalProfilingMetadataDocument => ({
      index: STACKFRAMES_INDEX,
      id: frameIds[frameIndex],
      document: getStackframeDocument(frame),
    })
  );

  const executables = frames.flatMap((frame): UniversalProfilingMetadataDocument[] =>
    frame.executable
      ? [
          {
            index: EXECUTABLES_INDEX,
            id: getFileId(frame).toString('base64url'),
            document: {
              '@timestamp': Math.floor(Date.now() / 1000),
              'Executable.build.id': hash(frame.executable, FILE_ID_BYTES).toString('hex'),
              'Executable.file.name': frame.executable,
            },
          },
        ]
      : []
  );

  return { id, weight, documents: [stacktrace, ...stackframes, ...executables] };
};

/** Creates a stack trace for every frame of the call tree that has a self weight. */
export const createUniversalProfilingStackTraces = (
  callTree: UniversalProfilingCallTree,
  parentFrames: UniversalProfilingFrame[] = []
): UniversalProfilingStackTrace[] => {
  const { frame, selfWeight, children = [] } = callTree;
  const frames = [...parentFrames, frame];

  return [
    ...(selfWeight ? [createUniversalProfilingStackTrace(frames, selfWeight)] : []),
    ...children.flatMap((child) => createUniversalProfilingStackTraces(child, frames)),
  ];
};
