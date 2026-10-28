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

export const UNIVERSAL_PROFILING_STACKTRACES_INDEX = 'profiling-stacktraces';
export const UNIVERSAL_PROFILING_STACKFRAMES_INDEX = 'profiling-stackframes';
export const UNIVERSAL_PROFILING_EXECUTABLES_INDEX = 'profiling-executables';

export const OTEL_PROFILING_STACKTRACES_INDEX = 'profiling-stacktraces.otel-default';
export const OTEL_PROFILING_STACKFRAMES_INDEX = 'profiling-stackframes.otel-default';
export const OTEL_PROFILING_EXECUTABLES_INDEX = 'profiling-executables.otel-default';

const FILE_ID_BYTES = 16;
const ADDRESS_OR_LINE_BYTES = 8;
const STACKTRACE_ID_BYTES = 16;
const MAX_FRAME_TYPE_RUN_LENGTH = 255;

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;
// The Unix epoch is a Thursday, so weeks starting on Monday are offset by 4 days.
const WEEK_START_OFFSET_SECONDS = 4 * SECONDS_PER_DAY;

export interface ProfilingMetadataDocument {
  index: string;
  id: string;
  document: object;
}

export interface ProfilingFrame {
  type: FrameType;
  functionName: string;
  /** Binary that contains the frame. Native and kernel frames set it, interpreted frames don't. */
  executable?: string;
  fileName?: string;
  lineNumber?: number;
}

export interface ProfilingCallTree {
  frame: ProfilingFrame;
  /** Relative number of samples in which this frame is the leaf of the stack. */
  selfWeight?: number;
  children?: ProfilingCallTree[];
}

export interface ProfilingStackTrace {
  id: string;
  /** Relative number of samples of the stack trace. */
  weight: number;
  /** Frames ordered from the root to the leaf. */
  frames: ProfilingFrame[];
  frameIds: string[];
  /** Run-length encoded frame types. */
  frameTypes: string;
}

/** How OTel executable documents are keyed. See `getOtelProfilingMetadataDocuments`. */
export type OtelExecutableIdEncoding = 'hex' | 'base64url';

const hash = (value: string, bytes: number): Buffer =>
  createHash('sha256').update(value).digest().subarray(0, bytes);

// The agent hashes the file contents; hashing the name keeps the IDs stable across runs.
const getFileId = ({ executable, fileName, functionName }: ProfilingFrame): Buffer =>
  hash(executable ?? fileName ?? functionName, FILE_ID_BYTES);

// A frame ID is the file ID followed by the address (native frames) or line (interpreted frames).
const getFrameId = (frame: ProfilingFrame): string =>
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

// Like the OTel exporter, which truncates the time to the week (starting on Monday).
const getStartOfWeekInSeconds = (date: Date): number => {
  const secondsSinceFirstMonday = Math.floor(date.getTime() / 1000) - WEEK_START_OFFSET_SECONDS;
  return (
    secondsSinceFirstMonday -
    (secondsSinceFirstMonday % SECONDS_PER_WEEK) +
    WEEK_START_OFFSET_SECONDS
  );
};

const hasExecutable = (frame: ProfilingFrame): frame is ProfilingFrame & { executable: string } =>
  frame.executable !== undefined;

/** Creates a stack trace, given its frames ordered from the root to the leaf. */
export const createProfilingStackTrace = (
  frames: ProfilingFrame[],
  weight: number = 1
): ProfilingStackTrace => {
  const frameIds = frames.map(getFrameId);

  return {
    id: hash(frameIds.join(''), STACKTRACE_ID_BYTES).toString('base64url'),
    weight,
    frames,
    frameIds,
    frameTypes: encodeFrameTypes(frames.map(({ type }) => type)),
  };
};

/** Creates a stack trace for every frame of the call tree that has a self weight. */
export const createProfilingStackTraces = (
  callTree: ProfilingCallTree,
  parentFrames: ProfilingFrame[] = []
): ProfilingStackTrace[] => {
  const { frame, selfWeight, children = [] } = callTree;
  const frames = [...parentFrames, frame];

  return [
    ...(selfWeight ? [createProfilingStackTrace(frames, selfWeight)] : []),
    ...children.flatMap((child) => createProfilingStackTraces(child, frames)),
  ];
};

/** Creates the Universal Profiling stacktrace, stackframes and executables documents of a stack trace. */
export const getUniversalProfilingMetadataDocuments = ({
  id,
  frames,
  frameIds,
  frameTypes,
}: ProfilingStackTrace): ProfilingMetadataDocument[] => [
  {
    index: UNIVERSAL_PROFILING_STACKTRACES_INDEX,
    id,
    document: {
      'Stacktrace.frame.ids': frameIds.join(''),
      'Stacktrace.frame.types': frameTypes,
    },
  },
  ...frames.map(({ functionName, fileName, lineNumber }, frameIndex) => ({
    index: UNIVERSAL_PROFILING_STACKFRAMES_INDEX,
    id: frameIds[frameIndex],
    document: {
      'Stackframe.function.name': functionName,
      ...(fileName ? { 'Stackframe.file.name': fileName } : {}),
      ...(lineNumber !== undefined ? { 'Stackframe.line.number': lineNumber } : {}),
    },
  })),
  ...frames.filter(hasExecutable).map((frame) => ({
    index: UNIVERSAL_PROFILING_EXECUTABLES_INDEX,
    id: getFileId(frame).toString('base64url'),
    document: {
      '@timestamp': Math.floor(Date.now() / 1000),
      'Executable.build.id': hash(frame.executable, FILE_ID_BYTES).toString('hex'),
      'Executable.file.name': frame.executable,
    },
  })),
];

/**
 * Creates the OTel stacktrace, stackframes and executables documents of a stack trace.
 * The OTel exporter keys executables by their hex file ID, while Elasticsearch looks them up by
 * the base64url file ID of the frames, so executables only resolve with `base64url`.
 */
export const getOtelProfilingMetadataDocuments = (
  { id, frames, frameIds, frameTypes }: ProfilingStackTrace,
  executableIdEncoding: OtelExecutableIdEncoding = 'hex'
): ProfilingMetadataDocument[] => {
  const now = new Date();
  const timestamp = now.toISOString();

  return [
    {
      index: OTEL_PROFILING_STACKTRACES_INDEX,
      id,
      document: {
        '@timestamp': timestamp,
        'frame.ids': frameIds.join(''),
        'frame.types': frameTypes,
      },
    },
    // The exporter writes arrays, to support inlined frames.
    ...frames.map(({ functionName, fileName, lineNumber }, frameIndex) => ({
      index: OTEL_PROFILING_STACKFRAMES_INDEX,
      id: frameIds[frameIndex],
      document: {
        '@timestamp': timestamp,
        'function.name': [functionName],
        'function.filename': [fileName ?? ''],
        'line.number': [lineNumber ?? 0],
      },
    })),
    ...frames.filter(hasExecutable).map((frame) => {
      const fileId = getFileId(frame);

      return {
        index: OTEL_PROFILING_EXECUTABLES_INDEX,
        id: fileId.toString(executableIdEncoding),
        document: {
          '@timestamp': getStartOfWeekInSeconds(now),
          resource: {
            attributes: {
              'process.executable.build_id.htlhash': fileId.toString('hex'),
              'process.executable.name': frame.executable,
            },
          },
        },
      };
    }),
  ];
};
