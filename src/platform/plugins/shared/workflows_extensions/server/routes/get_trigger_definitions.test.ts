/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { z } from '@kbn/zod/v4';
import { registerGetTriggerDefinitionsRoute } from './get_trigger_definitions';
import { TriggerRegistry } from '../trigger_registry';
import type { ServerTriggerDefinition } from '../types';

const createTrigger = (id: string, schema: z.ZodType): ServerTriggerDefinition =>
  ({ id, eventSchema: schema } as ServerTriggerDefinition);

describe('registerGetTriggerDefinitionsRoute', () => {
  it('registers a GET route at the expected path with internal access and authz disabled', () => {
    const router = httpServiceMock.createRouter();
    registerGetTriggerDefinitionsRoute(router, new TriggerRegistry());

    expect(router.get).toHaveBeenCalledTimes(1);
    const [routeConfig] = router.get.mock.calls[0];
    expect(routeConfig.path).toBe('/internal/workflows_extensions/trigger_definitions');
    expect(routeConfig.options?.access).toBe('internal');
    expect(routeConfig.security?.authz).toHaveProperty('enabled', false);
    expect(routeConfig.validate).toBe(false);
  });

  it('returns triggers sorted alphabetically with schema hashes', async () => {
    const registry = new TriggerRegistry();
    registry.register(createTrigger('z.trigger', z.object({ a: z.string() })));
    registry.register(createTrigger('a.trigger', z.object({ b: z.number() })));

    const router = httpServiceMock.createRouter();
    registerGetTriggerDefinitionsRoute(router, registry);

    const [, handler] = router.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({} as any, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledTimes(1);
    const { body } = response.ok.mock.calls[0][0]!;
    const { triggers } = body as { triggers: Array<{ id: string; schemaHash: string }> };

    expect(triggers.map((t) => t.id)).toEqual(['a.trigger', 'z.trigger']);
    triggers.forEach((t) => expect(t.schemaHash).toMatch(/^[a-f0-9]+$/));
  });

  it('returns empty string for schemaHash when z.toJSONSchema fails', async () => {
    // Use a fake registry that returns a trigger with a schema that causes toJSONSchema to throw
    const badSchema = {
      shape: {},
      safeParse: () => ({ success: true }),
    } as unknown as z.ZodType;
    const fakeRegistry = {
      list: () => [{ id: 'bad.trigger', eventSchema: badSchema }],
    } as unknown as TriggerRegistry;

    const router = httpServiceMock.createRouter();
    registerGetTriggerDefinitionsRoute(router, fakeRegistry);

    const [, handler] = router.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({} as any, httpServerMock.createKibanaRequest(), response);

    const { body } = response.ok.mock.calls[0][0]!;
    const { triggers } = body as { triggers: Array<{ id: string; schemaHash: string }> };
    expect(triggers[0].schemaHash).toBe('');
  });

  it('returns empty triggers array when registry is empty', async () => {
    const router = httpServiceMock.createRouter();
    registerGetTriggerDefinitionsRoute(router, new TriggerRegistry());

    const [, handler] = router.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({} as any, httpServerMock.createKibanaRequest(), response);

    const { body } = response.ok.mock.calls[0][0]!;
    expect((body as { triggers: unknown[] }).triggers).toEqual([]);
  });

  it('produces identical hashes for identical schemas', async () => {
    const registry = new TriggerRegistry();
    registry.register(createTrigger('a.trigger', z.object({ x: z.string() })));
    registry.register(createTrigger('b.trigger', z.object({ x: z.string() })));

    const router = httpServiceMock.createRouter();
    registerGetTriggerDefinitionsRoute(router, registry);

    const [, handler] = router.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({} as any, httpServerMock.createKibanaRequest(), response);

    const { body } = response.ok.mock.calls[0][0]!;
    const { triggers } = body as { triggers: Array<{ id: string; schemaHash: string }> };
    expect(triggers[0].schemaHash).toBe(triggers[1].schemaHash);
  });

  it('produces different hashes for different schemas', async () => {
    const registry = new TriggerRegistry();
    registry.register(createTrigger('a.trigger', z.object({ x: z.string() })));
    registry.register(createTrigger('b.trigger', z.object({ y: z.number() })));

    const router = httpServiceMock.createRouter();
    registerGetTriggerDefinitionsRoute(router, registry);

    const [, handler] = router.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({} as any, httpServerMock.createKibanaRequest(), response);

    const { body } = response.ok.mock.calls[0][0]!;
    const { triggers } = body as { triggers: Array<{ id: string; schemaHash: string }> };
    expect(triggers[0].schemaHash).not.toBe(triggers[1].schemaHash);
  });
});
