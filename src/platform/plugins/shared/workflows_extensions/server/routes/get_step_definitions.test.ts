/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { StepDefinitionResponseItem } from './get_step_definitions';
import { registerGetStepDefinitionsRoute } from './get_step_definitions';
import type { StepDocMetadata } from '../../common/step_registry/types';
import { ServerStepRegistry } from '../step_registry';

describe('registerGetStepDefinitionsRoute', () => {
  const router = httpServiceMock.createRouter();
  const registry = new ServerStepRegistry();

  beforeEach(() => {
    router.get.mockClear();
  });

  it('registers a GET route at the expected path with internal access and authz disabled', () => {
    registerGetStepDefinitionsRoute(router, registry, new Map());

    expect(router.get).toHaveBeenCalledTimes(1);
    const [routeConfig] = router.get.mock.calls[0];
    expect(routeConfig.path).toBe('/internal/workflows_extensions/step_definitions');
    expect(routeConfig.options?.access).toBe('internal');
    expect(routeConfig.security?.authz).toHaveProperty('enabled', false);
    expect(routeConfig.validate).toBe(false);
  });

  it('returns steps sorted alphabetically with handler hashes', async () => {
    const stepRegistry = new ServerStepRegistry();
    const sharedHandler = async () => ({ output: {} });
    stepRegistry.register({ id: 'z.step', handler: sharedHandler } as any);
    stepRegistry.register({ id: 'a.step', handler: sharedHandler } as any);
    stepRegistry.register({ id: 'm.step', handler: sharedHandler } as any);

    const testRouter = httpServiceMock.createRouter();
    registerGetStepDefinitionsRoute(testRouter, stepRegistry, new Map());

    const [, handler] = testRouter.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({} as any, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledTimes(1);
    const { body } = response.ok.mock.calls[0][0]!;
    const { steps } = body as {
      steps: Array<{ id: string; handlerHash: string; stepCategory?: string }>;
    };

    expect(steps.map((s) => s.id)).toEqual(['a.step', 'm.step', 'z.step']);
    // All share the same handler, so hashes must be identical
    expect(steps[0].handlerHash).toBe(steps[1].handlerHash);
    expect(steps[1].handlerHash).toBe(steps[2].handlerHash);
    // Hashes are non-empty hex strings
    expect(steps[0].handlerHash).toMatch(/^[a-f0-9]+$/);
    expect(steps.every((s) => s.stepCategory === undefined)).toBe(true);
  });

  it('includes stepCategory only when doc metadata exists for that step', async () => {
    const stepRegistry = new ServerStepRegistry();
    const sharedHandler = async () => ({ output: {} });
    stepRegistry.register({ id: 'withDoc', category: 'ai', handler: sharedHandler } as any);
    stepRegistry.register({ id: 'noDoc', category: 'data', handler: sharedHandler } as any);

    const docStore = new Map<string, StepDocMetadata>([
      ['withDoc', { id: 'withDoc', label: 'With', description: 'Has metadata' }],
    ]);

    const testRouter = httpServiceMock.createRouter();
    registerGetStepDefinitionsRoute(testRouter, stepRegistry, docStore);

    const [, handler] = testRouter.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({} as any, httpServerMock.createKibanaRequest(), response);

    const { steps } = response.ok.mock.calls[0][0]!.body as { steps: StepDefinitionResponseItem[] };
    const withDoc = steps.find((s) => s.id === 'withDoc');
    const noDoc = steps.find((s) => s.id === 'noDoc');
    expect(withDoc?.stepCategory).toBe('ai');
    expect(noDoc?.stepCategory).toBeUndefined();
  });

  it('returns empty steps array when registry is empty', async () => {
    const emptyRegistry = new ServerStepRegistry();
    const testRouter = httpServiceMock.createRouter();
    registerGetStepDefinitionsRoute(testRouter, emptyRegistry, new Map());

    const [, handler] = testRouter.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({} as any, httpServerMock.createKibanaRequest(), response);

    const { body } = response.ok.mock.calls[0][0]!;
    expect((body as { steps: unknown[] }).steps).toEqual([]);
  });

  it('produces different hashes for different handler implementations', async () => {
    const stepRegistry = new ServerStepRegistry();
    stepRegistry.register({ id: 'a.step', handler: async () => ({ output: 'a' }) } as any);
    stepRegistry.register({ id: 'b.step', handler: async () => ({ output: 'b' }) } as any);

    const testRouter = httpServiceMock.createRouter();
    registerGetStepDefinitionsRoute(testRouter, stepRegistry, new Map());

    const [, handler] = testRouter.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({} as any, httpServerMock.createKibanaRequest(), response);

    const { body } = response.ok.mock.calls[0][0]!;
    const { steps } = body as { steps: Array<{ id: string; handlerHash: string }> };
    expect(steps[0].handlerHash).not.toBe(steps[1].handlerHash);
  });
});
