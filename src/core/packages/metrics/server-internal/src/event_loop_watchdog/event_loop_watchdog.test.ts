/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockPprofLoaded = jest.fn();
jest.mock('@datadog/pprof', () => {
  mockPprofLoaded();
  return { time: {} };
});

import { isPointerCompressed, loadPprof } from './event_loop_watchdog';

describe('loadPprof', () => {
  beforeEach(() => jest.clearAllMocks());

  it('never loads the native profiler under pointer compression (starting it segfaults)', async () => {
    await expect(loadPprof(true)).rejects.toThrow(
      'the prebuilt @datadog/pprof binaries are incompatible with Node.js built with pointer compression'
    );
    expect(mockPprofLoaded).not.toHaveBeenCalled();
  });

  it('loads it otherwise', async () => {
    await expect(loadPprof(false)).resolves.toMatchObject({ time: {} });
    expect(mockPprofLoaded).toHaveBeenCalledTimes(1);
  });
});

describe('isPointerCompressed', () => {
  const variables = process.config.variables;

  it('reads the Node.js build configuration', () => {
    expect(isPointerCompressed({ ...variables, v8_enable_pointer_compression: 1 })).toBe(true);
    expect(isPointerCompressed({ ...variables, v8_enable_pointer_compression: 0 })).toBe(false);
    expect(isPointerCompressed({ ...variables, v8_enable_pointer_compression: undefined })).toBe(
      false
    );
  });
});
