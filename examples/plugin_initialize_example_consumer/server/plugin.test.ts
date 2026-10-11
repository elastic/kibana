/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import type { PluginInitStatus } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { PluginInitializeExampleStartContract } from '@kbn/plugin-initialize-example-plugin/server';
import { PluginInitializeExampleConsumerServerPlugin } from './plugin';
import { DEPENDENCY_ID, DOC_ROUTE, INITIALIZE_ROUTE, STATUS_ROUTE } from '../common/constants';

type InitializerContextMock = ReturnType<typeof coreMock.createPluginInitializerContext>;

const doc = {
  instanceUuid: 'instance-uuid',
  initializedAt: '2026-01-01T00:00:00.000Z',
  attempt: 1,
};

const setupPlugin = () => {
  const ctx = coreMock.createPluginInitializerContext();
  const plugin = new PluginInitializeExampleConsumerServerPlugin(ctx);
  const core = coreMock.createSetup();
  const router = httpServiceMock.createRouter();
  core.http.createRouter.mockReturnValue(router);
  const dependencyStatus$ = new Subject<PluginInitStatus>();
  core.plugins.pluginInitStatus$.mockReturnValue(dependencyStatus$);
  plugin.setup(core);

  // What core injects into start(core, plugins) at boot for the required dependency.
  const dependency: jest.Mocked<PluginInitializeExampleStartContract> = {
    getDoc: jest.fn().mockResolvedValue(doc),
    getInstanceInfo: jest.fn(),
  };
  const contract = plugin.start(coreMock.createStart(), { pluginInitializeExample: dependency });
  return { ctx, plugin, core, router, dependency, contract, dependencyStatus$ };
};

const infoMessages = (ctx: InitializerContextMock) =>
  loggingSystemMock.collect(ctx.logger).info.map(([message]) => message);

const findHandler = <Call extends [{ path: string }, unknown]>(
  calls: Call[],
  path: string
): Call[1] => {
  const call = calls.find(([config]) => config.path === path);
  if (!call) {
    throw new Error(`No route registered for ${path}`);
  }
  return call[1];
};

const request = () => httpServerMock.createKibanaRequest();

describe('PluginInitializeExampleConsumerServerPlugin', () => {
  it('start() keeps the dependency received at boot and delegates getDependencyDoc() to it', async () => {
    const { contract, dependency } = setupPlugin();

    await expect(contract.getDependencyDoc()).resolves.toEqual(doc);
    expect(dependency.getDoc).toHaveBeenCalledTimes(1);
  });

  it('subscribes to the dependency status in setup() and logs each transition until stop()', () => {
    const { ctx, plugin, core, dependencyStatus$ } = setupPlugin();
    expect(core.plugins.pluginInitStatus$).toHaveBeenCalledWith(DEPENDENCY_ID);

    dependencyStatus$.next({ state: 'initializing', attempts: 0 });
    dependencyStatus$.next({ state: 'failed', attempts: 1, lastError: new Error('boom') });
    expect(infoMessages(ctx)).toEqual([
      'pluginInitializeExample initialize() status: initializing (attempts: 0)',
      'pluginInitializeExample initialize() status: failed (attempts: 1, lastError: boom)',
    ]);

    plugin.stop();
    dependencyStatus$.next({ state: 'available', attempts: 0 });
    expect(infoMessages(ctx)).toHaveLength(2);
  });

  it('the doc route calls getDoc() on the stored dependency contract', async () => {
    const { router, dependency } = setupPlugin();
    const response = httpServerMock.createResponseFactory();

    await findHandler(router.get.mock.calls, DOC_ROUTE)({} as never, request(), response);

    expect(dependency.getDoc).toHaveBeenCalledTimes(1);
    expect(response.ok).toHaveBeenCalledWith({ body: doc });
  });

  it('the doc route lets a failed dependency initialization escape, for core to answer 503', async () => {
    const { router, dependency } = setupPlugin();
    dependency.getDoc.mockRejectedValueOnce(new Error('initialize() failed'));

    await expect(
      findHandler(router.get.mock.calls, DOC_ROUTE)(
        {} as never,
        request(),
        httpServerMock.createResponseFactory()
      )
    ).rejects.toThrow('initialize() failed');
  });

  it('the status route reports its own and the dependency status without triggering anything', async () => {
    const { ctx, core, router } = setupPlugin();
    ctx.initialization.getStatus.mockReturnValue({ state: 'available', attempts: 0 });
    core.plugins.getPluginInitStatus.mockReturnValue({
      state: 'failed',
      attempts: 3,
      lastError: new Error('boom'),
    });
    const response = httpServerMock.createResponseFactory();

    await findHandler(router.get.mock.calls, STATUS_ROUTE)({} as never, request(), response);

    expect(core.plugins.getPluginInitStatus).toHaveBeenCalledWith(DEPENDENCY_ID);
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        self: { state: 'available', attempts: 0 },
        dependency: { state: 'failed', attempts: 3, lastError: 'boom' },
      },
    });
    expect(core.plugins.initializePlugin).not.toHaveBeenCalled();
  });

  it('the initialize route waits for the dependency through core.plugins.initializePlugin', async () => {
    const { core, router } = setupPlugin();
    core.plugins.getPluginInitStatus.mockReturnValue({ state: 'initializing', attempts: 0 });
    core.plugins.initializePlugin.mockImplementation(async () => {
      core.plugins.getPluginInitStatus.mockReturnValue({ state: 'available', attempts: 0 });
    });
    const response = httpServerMock.createResponseFactory();

    await findHandler(router.post.mock.calls, INITIALIZE_ROUTE)({} as never, request(), response);

    expect(core.plugins.initializePlugin).toHaveBeenCalledWith(DEPENDENCY_ID);
    expect(response.ok).toHaveBeenCalledWith({ body: { state: 'available', attempts: 0 } });
  });
});
