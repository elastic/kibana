/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { emitEvent } from './emit_event';
import type { EmitEventDeps } from './emit_event';
import { setWorkflowEventChainContext } from './event_chain_context';
import { TriggerRegistry } from './trigger_registry';
import type { ServerTriggerDefinition } from './types';

const eventSchema = z.object({
  caseId: z.string(),
  status: z.string(),
});

const createDeps = (overrides: Partial<EmitEventDeps> = {}): EmitEventDeps => ({
  triggerRegistry: new TriggerRegistry(),
  triggerEventHandler: null,
  ...overrides,
});

const mockRequest = {} as any;

describe('emitEvent', () => {
  it('throws when triggerId is not registered', async () => {
    const registry = new TriggerRegistry();
    const deps = createDeps({ triggerRegistry: registry });

    await expect(
      emitEvent(
        {
          triggerId: 'unknown.trigger',
          spaceId: 'default',
          payload: {},
          request: mockRequest,
        },
        deps
      )
    ).rejects.toThrow('Trigger "unknown.trigger" is not registered');
  });

  it('throws when payload does not match the trigger eventSchema', async () => {
    const registry = new TriggerRegistry();
    registry.register({
      id: 'cases.updated',
      eventSchema,
    } as ServerTriggerDefinition);
    const handler = jest.fn();
    const deps = createDeps({
      triggerRegistry: registry,
      triggerEventHandler: handler,
    });

    await expect(
      emitEvent(
        {
          triggerId: 'cases.updated',
          spaceId: 'default',
          payload: { wrong: 'shape' },
          request: mockRequest,
        },
        deps
      )
    ).rejects.toThrow(/did not match the trigger's eventSchema/);

    expect(handler).not.toHaveBeenCalled();
  });

  it('calls handler when payload matches eventSchema', async () => {
    const registry = new TriggerRegistry();
    registry.register({
      id: 'cases.updated',
      eventSchema,
    } as ServerTriggerDefinition);
    const handler = jest.fn().mockResolvedValue(undefined);
    const deps = createDeps({
      triggerRegistry: registry,
      triggerEventHandler: handler,
    });

    await emitEvent(
      {
        triggerId: 'cases.updated',
        spaceId: 'default',
        payload: { caseId: '123', status: 'open' },
        request: mockRequest,
      },
      deps
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerId: 'cases.updated',
        spaceId: 'default',
        payload: { caseId: '123', status: 'open' },
        request: mockRequest,
      })
    );
    expect(handler.mock.calls[0][0]).toHaveProperty('timestamp');
  });

  it('passes eventChainContext undefined when request has no chain context (e.g. direct emit_loop)', async () => {
    const registry = new TriggerRegistry();
    registry.register({
      id: 'cases.updated',
      eventSchema,
    } as ServerTriggerDefinition);
    const handler = jest.fn().mockResolvedValue(undefined);
    const deps = createDeps({
      triggerRegistry: registry,
      triggerEventHandler: handler,
    });
    const bareRequest = {} as any;

    await emitEvent(
      {
        triggerId: 'cases.updated',
        spaceId: 'default',
        payload: { caseId: '123', status: 'open' },
        request: bareRequest,
      },
      deps
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].eventChainContext).toBeUndefined();
  });

  it('passes eventChainContext from request when not provided in params', async () => {
    const registry = new TriggerRegistry();
    registry.register({
      id: 'cases.updated',
      eventSchema,
    } as ServerTriggerDefinition);
    const handler = jest.fn().mockResolvedValue(undefined);
    const deps = createDeps({
      triggerRegistry: registry,
      triggerEventHandler: handler,
    });
    const requestWithContext = {} as any;
    setWorkflowEventChainContext(requestWithContext, { depth: 1, sourceExecutionId: 'exec-1' });

    await emitEvent(
      {
        triggerId: 'cases.updated',
        spaceId: 'default',
        payload: { caseId: '123', status: 'open' },
        request: requestWithContext,
      },
      deps
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        eventChainContext: { depth: 1, sourceExecutionId: 'exec-1' },
      })
    );
  });

  it('skips schema validation when eventSchema has no safeParse method', async () => {
    const registry = new TriggerRegistry();
    registry.register({
      id: 'cases.updated',
      eventSchema,
    } as ServerTriggerDefinition);
    // Overwrite the definition's eventSchema with an object that lacks safeParse
    const definition = registry.get('cases.updated')!;
    (definition as any).eventSchema = { shape: {} };
    const handler = jest.fn().mockResolvedValue(undefined);
    const deps = createDeps({
      triggerRegistry: registry,
      triggerEventHandler: handler,
    });

    await emitEvent(
      {
        triggerId: 'cases.updated',
        spaceId: 'default',
        payload: { anything: 'goes' },
        request: mockRequest,
      },
      deps
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('includes stringified error when schema validation error is not an Error instance', async () => {
    const registry = new TriggerRegistry();
    registry.register({
      id: 'cases.updated',
      eventSchema,
    } as ServerTriggerDefinition);
    // Replace eventSchema with a fake that returns a non-Error failure
    const definition = registry.get('cases.updated')!;
    (definition as any).eventSchema = {
      safeParse: () => ({ success: false, error: 'string-error-detail' }),
    };
    const handler = jest.fn();
    const deps = createDeps({
      triggerRegistry: registry,
      triggerEventHandler: handler,
    });

    await expect(
      emitEvent(
        {
          triggerId: 'cases.updated',
          spaceId: 'default',
          payload: { caseId: '123', status: 'open' },
          request: mockRequest,
        },
        deps
      )
    ).rejects.toThrow('string-error-detail');

    expect(handler).not.toHaveBeenCalled();
  });

  it('throws when no handler is registered', async () => {
    const registry = new TriggerRegistry();
    registry.register({
      id: 'cases.updated',
      eventSchema,
    } as ServerTriggerDefinition);
    const deps = createDeps({
      triggerRegistry: registry,
      triggerEventHandler: null,
    });

    await expect(
      emitEvent(
        {
          triggerId: 'cases.updated',
          spaceId: 'default',
          payload: { caseId: '123', status: 'open' },
          request: mockRequest,
        },
        deps
      )
    ).rejects.toThrow('No trigger event handler registered');
  });
});
