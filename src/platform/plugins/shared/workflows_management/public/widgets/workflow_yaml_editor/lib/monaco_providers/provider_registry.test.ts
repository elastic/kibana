/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import type { ConnectorExamples, MonacoConnectorHandler } from './provider_interfaces';
import {
  clearHandlerRegistry,
  getMonacoConnectorHandler,
  getMonacoHandlerRegistry,
  registerMonacoConnectorHandler,
} from './provider_registry';

const createMockHandler = (
  prefix: string,
  priority: number,
  canHandleFn?: (type: string) => boolean
): MonacoConnectorHandler => ({
  canHandle: canHandleFn ?? ((type: string) => type.startsWith(prefix)),
  getPriority: () => priority,
  generateHoverContent: jest
    .fn()
    .mockResolvedValue({ value: `hover-${prefix}`, isTrusted: true } as monaco.IMarkdownString),
  getExamples: jest.fn().mockReturnValue(null as ConnectorExamples | null),
});

describe('MonacoConnectorHandlerRegistry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearHandlerRegistry();
  });

  describe('register', () => {
    it('should register a handler', () => {
      const registry = getMonacoHandlerRegistry();
      const handler = createMockHandler('test.', 50);

      registry.register(handler);

      expect(registry.getHandler('test.search')).toBe(handler);
    });

    it('should not register the same handler twice', () => {
      const registry = getMonacoHandlerRegistry();
      const handler = createMockHandler('test.', 50);

      registry.register(handler);
      registry.register(handler);

      // Only one handler should match
      const handlers = registry.getHandlers('test.search');
      expect(handlers).toHaveLength(1);
    });

    it('should sort handlers by priority (highest first)', () => {
      const registry = getMonacoHandlerRegistry();
      const lowPriority = createMockHandler('test.', 10);
      const highPriority = createMockHandler('test.', 100);
      const medPriority = createMockHandler('test.', 50);

      registry.register(lowPriority);
      registry.register(highPriority);
      registry.register(medPriority);

      // getHandler should return highest priority
      expect(registry.getHandler('test.anything')).toBe(highPriority);
    });
  });

  describe('getHandler', () => {
    it('should return the highest priority handler that can handle the type', () => {
      const registry = getMonacoHandlerRegistry();
      const esHandler = createMockHandler('elasticsearch.', 100);
      const genericHandler = createMockHandler('', 1, () => true);

      registry.register(esHandler);
      registry.register(genericHandler);

      expect(registry.getHandler('elasticsearch.search')).toBe(esHandler);
    });

    it('should return fallback handler when no specific handler matches', () => {
      const registry = getMonacoHandlerRegistry();
      const esHandler = createMockHandler('elasticsearch.', 100);
      const genericHandler = createMockHandler('', 1, () => true);

      registry.register(esHandler);
      registry.register(genericHandler);

      expect(registry.getHandler('unknown.type')).toBe(genericHandler);
    });

    it('should return null when no handler can handle the type', () => {
      const registry = getMonacoHandlerRegistry();
      const esHandler = createMockHandler('elasticsearch.', 100);

      registry.register(esHandler);

      expect(registry.getHandler('kibana.createSpace')).toBeNull();
    });

    it('should return null when registry is empty', () => {
      const registry = getMonacoHandlerRegistry();
      expect(registry.getHandler('anything')).toBeNull();
    });
  });

  describe('getHandlers', () => {
    it('should return all handlers that can handle the type, sorted by priority', () => {
      const registry = getMonacoHandlerRegistry();
      const specificHandler = createMockHandler('elasticsearch.', 100);
      const genericHandler = createMockHandler('', 1, () => true);
      const kibanaHandler = createMockHandler('kibana.', 90);

      registry.register(specificHandler);
      registry.register(genericHandler);
      registry.register(kibanaHandler);

      const handlers = registry.getHandlers('elasticsearch.search');
      expect(handlers).toHaveLength(2);
      expect(handlers[0]).toBe(specificHandler);
      expect(handlers[1]).toBe(genericHandler);
    });

    it('should return empty array when no handlers match', () => {
      const registry = getMonacoHandlerRegistry();
      const esHandler = createMockHandler('elasticsearch.', 100);
      registry.register(esHandler);

      expect(registry.getHandlers('kibana.search')).toEqual([]);
    });
  });

  describe('unregister', () => {
    it('should remove a registered handler', () => {
      const registry = getMonacoHandlerRegistry();
      const handler = createMockHandler('test.', 50);

      registry.register(handler);
      expect(registry.getHandler('test.search')).toBe(handler);

      registry.unregister(handler);
      expect(registry.getHandler('test.search')).toBeNull();
    });

    it('should be safe to unregister a handler that was not registered', () => {
      const registry = getMonacoHandlerRegistry();
      const handler = createMockHandler('test.', 50);

      // Should not throw
      registry.unregister(handler);
    });
  });

  describe('clear', () => {
    it('should remove all registered handlers', () => {
      const registry = getMonacoHandlerRegistry();
      registry.register(createMockHandler('a.', 10));
      registry.register(createMockHandler('b.', 20));
      registry.register(createMockHandler('c.', 30));

      registry.clear();

      expect(registry.getHandler('a.test')).toBeNull();
      expect(registry.getHandler('b.test')).toBeNull();
      expect(registry.getHandler('c.test')).toBeNull();
    });
  });

  describe('convenience functions', () => {
    it('registerMonacoConnectorHandler should register a handler', () => {
      const handler = createMockHandler('test.', 50);
      registerMonacoConnectorHandler(handler);

      const result = getMonacoConnectorHandler('test.search');
      expect(result).toBe(handler);
    });

    it('getMonacoConnectorHandler should find the best handler', () => {
      const esHandler = createMockHandler('elasticsearch.', 100);
      const genericHandler = createMockHandler('', 1, () => true);

      registerMonacoConnectorHandler(esHandler);
      registerMonacoConnectorHandler(genericHandler);

      expect(getMonacoConnectorHandler('elasticsearch.search')).toBe(esHandler);
      expect(getMonacoConnectorHandler('unknown.type')).toBe(genericHandler);
    });

    it('getMonacoConnectorHandler should return null when no handler matches', () => {
      expect(getMonacoConnectorHandler('anything')).toBeNull();
    });

    it('clearHandlerRegistry should clear all handlers', () => {
      registerMonacoConnectorHandler(createMockHandler('test.', 50));
      clearHandlerRegistry();
      expect(getMonacoConnectorHandler('test.search')).toBeNull();
    });
  });

  describe('getMonacoHandlerRegistry singleton', () => {
    it('should return the same instance on multiple calls', () => {
      const registry1 = getMonacoHandlerRegistry();
      const registry2 = getMonacoHandlerRegistry();
      expect(registry1).toBe(registry2);
    });

    it('should share state between calls', () => {
      const registry1 = getMonacoHandlerRegistry();
      const handler = createMockHandler('shared.', 50);
      registry1.register(handler);

      const registry2 = getMonacoHandlerRegistry();
      expect(registry2.getHandler('shared.test')).toBe(handler);
    });
  });

  describe('priority ordering', () => {
    it('should handle multiple handlers with the same priority', () => {
      const registry = getMonacoHandlerRegistry();
      const handler1 = createMockHandler('a.', 50);
      const handler2 = createMockHandler('b.', 50);

      registry.register(handler1);
      registry.register(handler2);

      // Both should be registered; the one matching should be returned
      expect(registry.getHandler('a.test')).toBe(handler1);
      expect(registry.getHandler('b.test')).toBe(handler2);
    });

    it('should resolve conflicts by priority when multiple handlers match', () => {
      const registry = getMonacoHandlerRegistry();
      const lowPriority = createMockHandler('', 1, () => true);
      const highPriority = createMockHandler('', 100, () => true);

      registry.register(lowPriority);
      registry.register(highPriority);

      expect(registry.getHandler('anything')).toBe(highPriority);
    });
  });
});
