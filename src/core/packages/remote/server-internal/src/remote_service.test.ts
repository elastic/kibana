/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'node:path';
import type { Logger } from '@kbn/logging';
import { RemoteService } from './remote_service';
import { Echo } from './__fixtures__/demo_plugin/server/remote/echo';
import {
  DemoCatalogToken,
  DemoRootToken,
  DemoStepKind,
  EchoToken,
} from './__fixtures__/demo_plugin/server/remote/tokens';

const FIXTURE = join(__dirname, '__fixtures__', 'demo_plugin');
const OTHER_FIXTURE = join(__dirname, '__fixtures__', 'other_plugin');
const ECHO_MODULE = join(FIXTURE, 'server', 'remote', 'echo.ts');

const logger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  isLevelEnabled: () => false,
  get: () => logger,
} as unknown as Logger;

function createService(): RemoteService {
  const service = new RemoteService(logger, { maxOldGenerationSizeMb: 256 });
  service.discover([FIXTURE]);
  service.register({
    id: 'demo',
    root: DemoRootToken,
    contributions: [DemoStepKind],
    dependencies: [DemoCatalogToken],
  });
  service.bind(EchoToken, () => new Echo());
  return service;
}

describe('RemoteService', () => {
  jest.setTimeout(30_000);

  it('runs the same graph in-process when Core selects that backend', async () => {
    const service = createService();
    await service.start('in_process');
    const session = await service.whenReady<{
      run(request: { scopeId: string; steps?: Array<{ type: string }> }): Promise<{
        executor: { isMainThread: boolean };
        coordinator: { isMainThread: boolean; marker: string };
        outputs: Array<{ marker: string }>;
      }>;
    }>('demo');
    const scopeId = session.openScope({ request: { id: 'local' } });
    const result = await session.stub.run({
      scopeId,
      steps: [{ type: 'demo.echoStep' }],
    });
    expect(result.executor.isMainThread).toBe(true);
    expect(result.coordinator.isMainThread).toBe(true);
    expect(result.coordinator.marker).toBe('coordinator');
    expect(result.outputs[0].marker).toBe('coordinator');
    await service.stop();
  });

  it('runs the executor on a worker and coordinator capabilities on main', async () => {
    const service = createService();
    await service.start('worker_thread');
    const session = await service.whenReady<{
      run(request: { scopeId: string; steps?: Array<{ type: string }> }): Promise<{
        executor: { isMainThread: boolean; threadId: number };
        coordinator: { isMainThread: boolean; marker: string; threadId: number };
        outputs: Array<{ marker: string }>;
      }>;
      block(milliseconds: number): Promise<number>;
      loadedModules(): Promise<string[]>;
    }>('demo');

    const scopeId = session.openScope({ request: { id: 'remote' } });
    const result = await session.stub.run({
      scopeId,
      steps: [{ type: 'demo.echoStep' }],
    });
    expect(result.executor.isMainThread).toBe(false);
    expect(result.coordinator.isMainThread).toBe(true);
    expect(result.coordinator.marker).toBe('coordinator');
    expect(result.executor.threadId).not.toBe(result.coordinator.threadId);
    expect(result.outputs[0].marker).toBe('coordinator');

    const loaded = await session.stub.loadedModules();
    expect(loaded.some((modulePath) => modulePath === ECHO_MODULE)).toBe(false);

    await expect(session.stub.run({ scopeId, steps: [{ type: 'demo.missing' }] })).rejects.toThrow(
      /Unsupported remote step type/
    );

    const pending = session.stub.block(300);
    let ticks = 0;
    const started = Date.now();
    while (Date.now() - started < 150) {
      await new Promise((resolve) => setImmediate(resolve));
      ticks++;
    }
    expect(ticks).toBeGreaterThan(2);
    await pending;
    session.closeScope(scopeId);
    await service.stop();
  });

  it('ignores another graph root, catalogue, and coordinator capability', async () => {
    const service = new RemoteService(logger, { maxOldGenerationSizeMb: 256 });
    service.discover([OTHER_FIXTURE, FIXTURE]);
    service.register({
      id: 'demo',
      root: DemoRootToken,
      contributions: [DemoStepKind],
      dependencies: [DemoCatalogToken],
    });
    service.bind(EchoToken, () => new Echo());
    await service.start('in_process');
    const session = await service.whenReady<{
      run(request: { scopeId: string; steps?: Array<{ type: string }> }): Promise<{
        outputs: Array<{ marker: string }>;
      }>;
    }>('demo');
    const scopeId = session.openScope({ request: { id: 'isolated' } });
    const result = await session.stub.run({ scopeId, steps: [{ type: 'demo.echoStep' }] });
    expect(result.outputs[0].marker).toBe('coordinator');
    session.closeScope(scopeId);
    await service.stop();
  });
});
