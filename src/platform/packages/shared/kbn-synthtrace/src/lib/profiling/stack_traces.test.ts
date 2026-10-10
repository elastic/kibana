/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FrameType } from '@kbn/profiling-utils';
import type { ProfilingFrame, ProfilingMetadataDocument } from './stack_traces';
import {
  createProfilingStackTrace,
  createProfilingStackTraces,
  getOtelProfilingMetadataDocuments,
  getUniversalProfilingMetadataDocuments,
  OTEL_PROFILING_EXECUTABLES_INDEX,
  OTEL_PROFILING_STACKFRAMES_INDEX,
  OTEL_PROFILING_STACKTRACES_INDEX,
  UNIVERSAL_PROFILING_EXECUTABLES_INDEX,
  UNIVERSAL_PROFILING_STACKFRAMES_INDEX,
  UNIVERSAL_PROFILING_STACKTRACES_INDEX,
} from './stack_traces';

const startThread: ProfilingFrame = {
  type: FrameType.Native,
  executable: 'libc.so.6',
  functionName: 'start_thread',
};
const runThread: ProfilingFrame = {
  type: FrameType.JVM,
  fileName: 'Thread.java',
  functionName: 'void java.lang.Thread.run()',
  lineNumber: 840,
};
const syscall: ProfilingFrame = {
  type: FrameType.Kernel,
  executable: 'vmlinux',
  functionName: 'do_syscall_64',
};

const getDocuments = (documents: ProfilingMetadataDocument[], index: string) =>
  documents.filter((document) => document.index === index);

const getFileId = (frameId: string): Buffer => Buffer.from(frameId, 'base64url').subarray(0, 16);

describe('createProfilingStackTrace', () => {
  const stackTrace = createProfilingStackTrace([startThread, runThread, syscall]);

  it('creates a 16-byte stack trace ID', () => {
    expect(Buffer.from(stackTrace.id, 'base64url')).toHaveLength(16);
  });

  it('creates 24-byte frame IDs from the root to the leaf', () => {
    expect(stackTrace.frameIds).toHaveLength(3);
    expect(Buffer.from(stackTrace.frameIds[0], 'base64url')).toHaveLength(24);
  });

  it('run-length encodes the frame types', () => {
    const { frameTypes } = createProfilingStackTrace([
      startThread,
      { ...startThread, functionName: 'clone3' },
      syscall,
    ]);

    expect(frameTypes).toBe(
      Buffer.from([2, FrameType.Native, 1, FrameType.Kernel]).toString('base64url')
    );
  });

  it('starts a new frame type run after 255 frames', () => {
    const { frameTypes } = createProfilingStackTrace(
      Array.from({ length: 256 }, (_, frameIndex) => ({
        ...syscall,
        functionName: `function_${frameIndex}`,
      }))
    );

    expect(frameTypes).toBe(
      Buffer.from([255, FrameType.Kernel, 1, FrameType.Kernel]).toString('base64url')
    );
  });

  it('creates the same IDs for the same frames', () => {
    expect(createProfilingStackTrace([startThread, runThread, syscall]).id).toBe(stackTrace.id);
    expect(createProfilingStackTrace([startThread, runThread]).id).not.toBe(stackTrace.id);
  });
});

describe('createProfilingStackTraces', () => {
  it('creates a stack trace for every frame with a self weight', () => {
    const stackTraces = createProfilingStackTraces({
      frame: startThread,
      children: [
        { frame: runThread, selfWeight: 3, children: [{ frame: syscall, selfWeight: 2 }] },
        { frame: syscall, selfWeight: 0 },
      ],
    });

    expect(stackTraces.map(({ id, weight }) => ({ id, weight }))).toEqual([
      { id: createProfilingStackTrace([startThread, runThread]).id, weight: 3 },
      { id: createProfilingStackTrace([startThread, runThread, syscall]).id, weight: 2 },
    ]);
  });
});

describe('getUniversalProfilingMetadataDocuments', () => {
  const stackTrace = createProfilingStackTrace([startThread, runThread, syscall]);
  const documents = getUniversalProfilingMetadataDocuments(stackTrace);

  it('creates the stacktrace document', () => {
    expect(getDocuments(documents, UNIVERSAL_PROFILING_STACKTRACES_INDEX)).toEqual([
      {
        index: UNIVERSAL_PROFILING_STACKTRACES_INDEX,
        id: stackTrace.id,
        document: {
          'Stacktrace.frame.ids': stackTrace.frameIds.join(''),
          'Stacktrace.frame.types': stackTrace.frameTypes,
        },
      },
    ]);
  });

  it('writes the stackframes with dotted keys', () => {
    expect(getDocuments(documents, UNIVERSAL_PROFILING_STACKFRAMES_INDEX)).toEqual([
      {
        index: UNIVERSAL_PROFILING_STACKFRAMES_INDEX,
        id: stackTrace.frameIds[0],
        document: { 'Stackframe.function.name': 'start_thread' },
      },
      {
        index: UNIVERSAL_PROFILING_STACKFRAMES_INDEX,
        id: stackTrace.frameIds[1],
        document: {
          'Stackframe.function.name': 'void java.lang.Thread.run()',
          'Stackframe.file.name': 'Thread.java',
          'Stackframe.line.number': 840,
        },
      },
      {
        index: UNIVERSAL_PROFILING_STACKFRAMES_INDEX,
        id: stackTrace.frameIds[2],
        document: { 'Stackframe.function.name': 'do_syscall_64' },
      },
    ]);
  });

  it('keys the executables by the base64url file ID of their frames', () => {
    expect(getDocuments(documents, UNIVERSAL_PROFILING_EXECUTABLES_INDEX)).toEqual([
      {
        index: UNIVERSAL_PROFILING_EXECUTABLES_INDEX,
        id: getFileId(stackTrace.frameIds[0]).toString('base64url'),
        document: expect.objectContaining({ 'Executable.file.name': 'libc.so.6' }),
      },
      {
        index: UNIVERSAL_PROFILING_EXECUTABLES_INDEX,
        id: getFileId(stackTrace.frameIds[2]).toString('base64url'),
        document: expect.objectContaining({ 'Executable.file.name': 'vmlinux' }),
      },
    ]);
  });
});

describe('getOtelProfilingMetadataDocuments', () => {
  const stackTrace = createProfilingStackTrace([startThread, runThread, syscall]);

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-08T12:34:56.789Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('creates the stacktrace document', () => {
    expect(
      getDocuments(getOtelProfilingMetadataDocuments(stackTrace), OTEL_PROFILING_STACKTRACES_INDEX)
    ).toEqual([
      {
        index: OTEL_PROFILING_STACKTRACES_INDEX,
        id: stackTrace.id,
        document: {
          '@timestamp': '2026-10-08T12:34:56.789Z',
          'frame.ids': stackTrace.frameIds.join(''),
          'frame.types': stackTrace.frameTypes,
        },
      },
    ]);
  });

  it('writes the stackframe fields as arrays', () => {
    const stackframes = getDocuments(
      getOtelProfilingMetadataDocuments(stackTrace),
      OTEL_PROFILING_STACKFRAMES_INDEX
    );

    expect(stackframes.map(({ id }) => id)).toEqual(stackTrace.frameIds);
    expect(stackframes.map(({ document }) => document)).toEqual([
      {
        '@timestamp': '2026-10-08T12:34:56.789Z',
        'function.name': ['start_thread'],
        'function.filename': [''],
        'line.number': [0],
      },
      {
        '@timestamp': '2026-10-08T12:34:56.789Z',
        'function.name': ['void java.lang.Thread.run()'],
        'function.filename': ['Thread.java'],
        'line.number': [840],
      },
      {
        '@timestamp': '2026-10-08T12:34:56.789Z',
        'function.name': ['do_syscall_64'],
        'function.filename': [''],
        'line.number': [0],
      },
    ]);
  });

  it('keys the executables by their hex file ID by default, like the OTel exporter', () => {
    const fileId = getFileId(stackTrace.frameIds[0]);
    const [executable] = getDocuments(
      getOtelProfilingMetadataDocuments(stackTrace),
      OTEL_PROFILING_EXECUTABLES_INDEX
    );

    expect(executable).toEqual({
      index: OTEL_PROFILING_EXECUTABLES_INDEX,
      id: fileId.toString('hex'),
      document: {
        // Monday 2026-10-05T00:00:00Z
        '@timestamp': 1791158400,
        resource: {
          attributes: {
            'process.executable.build_id.htlhash': fileId.toString('hex'),
            'process.executable.name': 'libc.so.6',
          },
        },
      },
    });
  });

  it('keys the executables by their base64url file ID, like Elasticsearch looks them up', () => {
    const executables = getDocuments(
      getOtelProfilingMetadataDocuments(stackTrace, 'base64url'),
      OTEL_PROFILING_EXECUTABLES_INDEX
    );

    expect(executables.map(({ id }) => id)).toEqual([
      getFileId(stackTrace.frameIds[0]).toString('base64url'),
      getFileId(stackTrace.frameIds[2]).toString('base64url'),
    ]);
  });
});
