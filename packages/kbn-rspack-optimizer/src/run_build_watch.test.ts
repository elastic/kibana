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
jest.mock('./hmr/hmr_server', () => ({
  HmrServer: jest.fn().mockImplementation(() => mockHmrServer),
}));

import { rspack } from './rspack_runtime';
import { createMultiCompileConfig } from './config/create_multi_compile_config';
import { runBuild } from './run_build';

import type { MultiCompiler } from '@rspack/core';

const mockHmrServer = {
  start: jest.fn().mockResolvedValue(1234),
  close: jest.fn().mockResolvedValue(undefined),
  broadcast: jest.fn(),
  broadcastBuilding: jest.fn(),
  broadcastReload: jest.fn(),
  broadcastErrors: jest.fn(),
};

const nextTick = () => new Promise<void>((resolve) => setImmediate(resolve));

type WatchCallback = (err: Error | null, stats?: unknown) => void;

const createStats = ({
  errors,
  kibanaHash = `hash-${errors.length}`,
  sharedHash,
}: {
  errors: string[];
  kibanaHash?: string;
  sharedHash?: string;
}) => {
  const child = {
    compilation: { name: 'kibana' },
    hash: kibanaHash,
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
  const shared = sharedHash
    ? [
        {
          compilation: { name: 'shared-src' },
          hash: sharedHash,
          hasErrors: () => false,
          hasWarnings: () => false,
          toJson: () => ({ errors: [] }),
        },
      ]
    : [];
  return {
    hasErrors: () => errors.length > 0,
    stats: [...shared, child],
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
    Object.values(mockHmrServer).forEach((fn) => fn.mockClear());
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

  it('reloads the page when a shared compiler rebuilds, and hot-updates otherwise', async () => {
    const pending = runBuild({ repoRoot: '/repo', watch: true, hmr: true, log });
    await nextTick();
    watchCallback(null, createStats({ errors: [], kibanaHash: 'k1', sharedHash: 's1' }));
    const result = await pending;

    watchCallback(null, createStats({ errors: [], kibanaHash: 'k2', sharedHash: 's1' }));
    expect(mockHmrServer.broadcast).toHaveBeenLastCalledWith('k2', '0.1', []);
    expect(mockHmrServer.broadcastReload).not.toHaveBeenCalled();

    watchCallback(null, createStats({ errors: [], kibanaHash: 'k3', sharedHash: 's2' }));
    expect(mockHmrServer.broadcastReload).toHaveBeenCalledTimes(1);
    expect(mockHmrServer.broadcast).not.toHaveBeenCalledWith(
      'k3',
      expect.anything(),
      expect.anything()
    );

    await result.close!();
    await result.done;
  });
});
