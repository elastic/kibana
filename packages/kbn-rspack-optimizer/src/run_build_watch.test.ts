/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';

jest.mock('./rspack_runtime', () => ({ rspack: jest.fn() }));
jest.mock('./config/create_multi_compile_config', () => ({
  createMultiCompileConfig: jest.fn(),
  KIBANA_COMPILER: 'kibana',
}));

import { rspack } from './rspack_runtime';
import { createMultiCompileConfig } from './config/create_multi_compile_config';
import { runBuild } from './run_build';

import type { MultiCompiler } from '@rspack/core';

const nextTick = () => new Promise<void>((resolve) => setImmediate(resolve));

type WatchCallback = (err: Error | null, stats?: unknown) => void;

const createStats = ({ errors }: { errors: string[] }) => {
  const child = {
    compilation: { name: 'kibana' },
    hash: `hash-${errors.length}`,
    hasErrors: () => errors.length > 0,
    hasWarnings: () => false,
    toString: () => errors.join('\n'),
    toJson: () => ({
      errors: errors.map((message) => ({ message })),
      entrypoints: { kibana: {} },
      assets: [{ name: 'kibana.bundle.js', size: 10 }],
      time: 100,
    }),
  };
  return {
    hasErrors: () => errors.length > 0,
    stats: [child],
  };
};

describe('runBuild in watch mode', () => {
  let watchCallback: WatchCallback;
  const close = jest.fn((cb: () => void) => cb());
  const writer = new ToolingLogCollectingWriter();
  const log = new ToolingLog();
  log.setWriters([writer]);

  beforeEach(() => {
    writer.messages.length = 0;
    close.mockClear();
    jest.mocked(createMultiCompileConfig).mockResolvedValue({ configs: [{}], bundleCount: 3 });
    const compiler = {
      compilers: [
        {
          name: 'kibana',
          outputPath: '/out',
          options: {},
        },
      ],
      hooks: { invalid: { tap: jest.fn() } },
      watch: jest.fn((_opts: unknown, cb: WatchCallback) => {
        watchCallback = cb;
        return { close };
      }),
    } as unknown as MultiCompiler;
    jest.mocked(rspack).mockReturnValue(compiler);
  });

  it('resolves a recoverable failure on initial errors and keeps rebuilding', async () => {
    const pending = runBuild({ repoRoot: '/repo', watch: true, hmr: false, log });

    // rspack invokes the watch callback asynchronously once the first compilation finishes
    await nextTick();
    watchCallback(null, createStats({ errors: ['Syntax Error: Unexpected token'] }));

    const result = await pending;
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['Syntax Error: Unexpected token']);
    expect(result.bundleCount).toBe(3);
    expect(result.close).toBeInstanceOf(Function);
    expect(result.done).toBeInstanceOf(Promise);
    expect(close).not.toHaveBeenCalled();

    watchCallback(null, createStats({ errors: [] }));
    expect(writer.messages.join('\n')).toContain('Rebuilt in 0.1s');

    await result.close!();
    await result.done;
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('resolves success with bundleCount when the initial build passes', async () => {
    const pending = runBuild({ repoRoot: '/repo', watch: true, hmr: false, log });
    await nextTick();
    watchCallback(null, createStats({ errors: [] }));
    const result = await pending;
    expect(result.success).toBe(true);
    expect(result.bundleCount).toBe(3);

    await result.close!();
    await result.done;
  });
});
