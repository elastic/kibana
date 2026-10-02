/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FrameType } from '@kbn/profiling-utils';
import type { UniversalProfilingFrame, UniversalProfilingMetadataDocument } from './stack_traces';
import {
  createUniversalProfilingStackTrace,
  createUniversalProfilingStackTraces,
  EXECUTABLES_INDEX,
  STACKFRAMES_INDEX,
  STACKTRACES_INDEX,
} from './stack_traces';

const startThread: UniversalProfilingFrame = {
  type: FrameType.Native,
  executable: 'libc.so.6',
  functionName: 'start_thread',
};
const runThread: UniversalProfilingFrame = {
  type: FrameType.JVM,
  fileName: 'Thread.java',
  functionName: 'void java.lang.Thread.run()',
  lineNumber: 840,
};
const syscall: UniversalProfilingFrame = {
  type: FrameType.Kernel,
  executable: 'vmlinux',
  functionName: 'do_syscall_64',
};

const getDocuments = (documents: UniversalProfilingMetadataDocument[], index: string) =>
  documents.filter((document) => document.index === index);

describe('createUniversalProfilingStackTrace', () => {
  const { id, documents } = createUniversalProfilingStackTrace([startThread, runThread, syscall]);
  const [stacktrace] = getDocuments(documents, STACKTRACES_INDEX);
  const stackframes = getDocuments(documents, STACKFRAMES_INDEX);
  const executables = getDocuments(documents, EXECUTABLES_INDEX);

  it('creates a 16-byte stack trace ID', () => {
    expect(Buffer.from(id, 'base64url')).toHaveLength(16);
    expect(stacktrace.id).toBe(id);
  });

  it('concatenates the frame IDs from the root to the leaf', () => {
    expect(stacktrace.document).toMatchObject({
      'Stacktrace.frame.ids': stackframes.map((stackframe) => stackframe.id).join(''),
    });
  });

  it('creates 24-byte frame IDs that start with the ID of their executable', () => {
    const [startThreadFrameId, , syscallFrameId] = stackframes.map(({ id: frameId }) =>
      Buffer.from(frameId, 'base64url')
    );

    expect(startThreadFrameId).toHaveLength(24);
    expect(executables.map((executable) => executable.id)).toEqual([
      startThreadFrameId.subarray(0, 16).toString('base64url'),
      syscallFrameId.subarray(0, 16).toString('base64url'),
    ]);
  });

  it('run-length encodes the frame types', () => {
    const { documents: nativeDocuments } = createUniversalProfilingStackTrace([
      startThread,
      { ...startThread, functionName: 'clone3' },
      syscall,
    ]);
    const [nativeStacktrace] = getDocuments(nativeDocuments, STACKTRACES_INDEX);

    expect(nativeStacktrace.document).toMatchObject({
      'Stacktrace.frame.types': Buffer.from([2, FrameType.Native, 1, FrameType.Kernel]).toString(
        'base64url'
      ),
    });
  });

  it('starts a new frame type run after 255 frames', () => {
    const frames = Array.from({ length: 256 }, (_, frameIndex) => ({
      ...syscall,
      functionName: `function_${frameIndex}`,
    }));
    const [longStacktrace] = getDocuments(
      createUniversalProfilingStackTrace(frames).documents,
      STACKTRACES_INDEX
    );

    expect(longStacktrace.document).toMatchObject({
      'Stacktrace.frame.types': Buffer.from([255, FrameType.Kernel, 1, FrameType.Kernel]).toString(
        'base64url'
      ),
    });
  });

  it('writes the stackframes with dotted keys', () => {
    expect(stackframes.map((stackframe) => stackframe.document)).toEqual([
      { 'Stackframe.function.name': 'start_thread' },
      {
        'Stackframe.function.name': 'void java.lang.Thread.run()',
        'Stackframe.file.name': 'Thread.java',
        'Stackframe.line.number': 840,
      },
      { 'Stackframe.function.name': 'do_syscall_64' },
    ]);
  });

  it('only creates executables for the frames that have one', () => {
    expect(executables.map((executable) => executable.document)).toEqual([
      expect.objectContaining({ 'Executable.file.name': 'libc.so.6' }),
      expect.objectContaining({ 'Executable.file.name': 'vmlinux' }),
    ]);
  });

  it('creates the same IDs for the same frames', () => {
    expect(createUniversalProfilingStackTrace([startThread, runThread, syscall]).id).toBe(id);
    expect(createUniversalProfilingStackTrace([startThread, runThread]).id).not.toBe(id);
  });
});

describe('createUniversalProfilingStackTraces', () => {
  it('creates a stack trace for every frame with a self weight', () => {
    const stackTraces = createUniversalProfilingStackTraces({
      frame: startThread,
      children: [
        { frame: runThread, selfWeight: 3, children: [{ frame: syscall, selfWeight: 2 }] },
        { frame: syscall, selfWeight: 0 },
      ],
    });

    expect(stackTraces.map(({ id, weight }) => ({ id, weight }))).toEqual([
      { id: createUniversalProfilingStackTrace([startThread, runThread]).id, weight: 3 },
      { id: createUniversalProfilingStackTrace([startThread, runThread, syscall]).id, weight: 2 },
    ]);
  });
});
