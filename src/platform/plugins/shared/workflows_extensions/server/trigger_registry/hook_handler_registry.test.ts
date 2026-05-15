/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HookHandler } from '@kbn/workflows/server/types';
import { HookHandlerRegistry } from './hook_handler_registry';

const makeHandler = (name: string): HookHandler => jest.fn().mockResolvedValue({ handledBy: name });

describe('HookHandlerRegistry', () => {
  let registry: HookHandlerRegistry;

  beforeEach(() => {
    registry = new HookHandlerRegistry();
  });

  it('returns empty array when no handlers are registered for a trigger', () => {
    expect(registry.getHandlers('unknown.trigger')).toEqual([]);
    expect(registry.hasHandlers('unknown.trigger')).toBe(false);
  });

  it('registers a single handler and retrieves it', () => {
    const handler = makeHandler('first');
    registry.register('cases.updated', handler);

    const handlers = registry.getHandlers('cases.updated');
    expect(handlers).toHaveLength(1);
    expect(handlers[0]).toBe(handler);
    expect(registry.hasHandlers('cases.updated')).toBe(true);
  });

  it('preserves registration order when multiple handlers are registered', () => {
    const h1 = makeHandler('first');
    const h2 = makeHandler('second');
    const h3 = makeHandler('third');
    registry.register('my.trigger', h1);
    registry.register('my.trigger', h2);
    registry.register('my.trigger', h3);

    const handlers = registry.getHandlers('my.trigger');
    expect(handlers).toHaveLength(3);
    expect(handlers[0]).toBe(h1);
    expect(handlers[1]).toBe(h2);
    expect(handlers[2]).toBe(h3);
  });

  it('isolates handlers per trigger id', () => {
    const h1 = makeHandler('t1');
    const h2 = makeHandler('t2');
    registry.register('trigger.one', h1);
    registry.register('trigger.two', h2);

    expect(registry.getHandlers('trigger.one')).toEqual([h1]);
    expect(registry.getHandlers('trigger.two')).toEqual([h2]);
  });
});
