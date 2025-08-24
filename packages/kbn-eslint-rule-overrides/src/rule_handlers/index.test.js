/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { registerRuleHandler, getRuleHandler, clearHandlers, getRegisteredHandlers } = require('.');

describe('Rule Handlers', () => {
  afterEach(() => {
    clearHandlers();
    // Re-register built-in handlers
    const noRestrictedImportsHandler = require('./no-restricted-imports');
    registerRuleHandler('no-restricted-imports', noRestrictedImportsHandler);
  });

  describe('registerRuleHandler', () => {
    it('should register a valid handler', () => {
      const handler = {
        ruleName: 'test-rule',
        process: jest.fn(),
      };

      registerRuleHandler('test-rule', handler);
      expect(getRuleHandler('test-rule')).toBe(handler);
    });

    it('should throw error for invalid rule name', () => {
      const handler = { process: jest.fn() };

      expect(() => registerRuleHandler('', handler)).toThrow(
        'Rule name must be a non-empty string'
      );
      expect(() => registerRuleHandler(null, handler)).toThrow(
        'Rule name must be a non-empty string'
      );
      expect(() => registerRuleHandler(123, handler)).toThrow(
        'Rule name must be a non-empty string'
      );
    });

    it('should throw error for invalid handler', () => {
      expect(() => registerRuleHandler('test-rule', null)).toThrow(
        'Handler must have a process function'
      );
      expect(() => registerRuleHandler('test-rule', {})).toThrow(
        'Handler must have a process function'
      );
      expect(() => registerRuleHandler('test-rule', { process: 'not-a-function' })).toThrow(
        'Handler must have a process function'
      );
    });

    it('should overwrite existing handler', () => {
      const handler1 = { process: jest.fn() };
      const handler2 = { process: jest.fn() };

      registerRuleHandler('test-rule', handler1);
      expect(getRuleHandler('test-rule')).toBe(handler1);

      registerRuleHandler('test-rule', handler2);
      expect(getRuleHandler('test-rule')).toBe(handler2);
    });
  });

  describe('getRuleHandler', () => {
    it('should return registered handler', () => {
      const handler = { process: jest.fn() };
      registerRuleHandler('test-rule', handler);

      expect(getRuleHandler('test-rule')).toBe(handler);
    });

    it('should return null for unregistered rule', () => {
      expect(getRuleHandler('non-existent-rule')).toBe(null);
    });

    it('should return built-in no-restricted-imports handler', () => {
      const handler = getRuleHandler('no-restricted-imports');
      expect(handler).toBeTruthy();
      expect(handler.ruleName).toBe('no-restricted-imports');
      expect(typeof handler.process).toBe('function');
    });
  });

  describe('clearHandlers', () => {
    it('should remove all handlers', () => {
      const handler1 = { process: jest.fn() };
      const handler2 = { process: jest.fn() };

      registerRuleHandler('rule1', handler1);
      registerRuleHandler('rule2', handler2);

      clearHandlers();

      expect(getRuleHandler('rule1')).toBe(null);
      expect(getRuleHandler('rule2')).toBe(null);
      expect(getRuleHandler('no-restricted-imports')).toBe(null);
    });
  });

  describe('getRegisteredHandlers', () => {
    it('should return list of registered handler names', () => {
      expect(getRegisteredHandlers()).toEqual(['no-restricted-imports']);

      const handler1 = { process: jest.fn() };
      const handler2 = { process: jest.fn() };

      registerRuleHandler('rule1', handler1);
      registerRuleHandler('rule2', handler2);

      const handlers = getRegisteredHandlers();
      expect(handlers).toContain('no-restricted-imports');
      expect(handlers).toContain('rule1');
      expect(handlers).toContain('rule2');
      expect(handlers).toHaveLength(3);
    });

    it('should return empty array after clearing', () => {
      clearHandlers();
      expect(getRegisteredHandlers()).toEqual([]);
    });
  });
});
