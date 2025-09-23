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

  describe('WHEN registering a rule handler', () => {
    describe('AND WHEN providing valid parameters', () => {
      it('SHOULD register the handler successfully', () => {
        const handler = {
          ruleName: 'test-rule',
          process: jest.fn(),
        };

        registerRuleHandler('test-rule', handler);
        expect(getRuleHandler('test-rule')).toBe(handler);
      });

      it('SHOULD overwrite existing handler when registering same rule name', () => {
        const handler1 = { process: jest.fn() };
        const handler2 = { process: jest.fn() };

        registerRuleHandler('test-rule', handler1);
        expect(getRuleHandler('test-rule')).toBe(handler1);

        registerRuleHandler('test-rule', handler2);
        expect(getRuleHandler('test-rule')).toBe(handler2);
      });
    });

    describe('AND WHEN providing invalid rule name', () => {
      it('SHOULD throw error for empty string', () => {
        const handler = { process: jest.fn() };

        expect(() => registerRuleHandler('', handler)).toThrow(
          'Rule name must be a non-empty string'
        );
      });

      it('SHOULD throw error for null value', () => {
        const handler = { process: jest.fn() };

        expect(() => registerRuleHandler(null, handler)).toThrow(
          'Rule name must be a non-empty string'
        );
      });

      it('SHOULD throw error for non-string value', () => {
        const handler = { process: jest.fn() };

        expect(() => registerRuleHandler(123, handler)).toThrow(
          'Rule name must be a non-empty string'
        );
      });
    });

    describe('AND WHEN providing invalid handler', () => {
      it('SHOULD throw error for null handler', () => {
        expect(() => registerRuleHandler('test-rule', null)).toThrow(
          'Handler must have a process function'
        );
      });

      it('SHOULD throw error for empty object handler', () => {
        expect(() => registerRuleHandler('test-rule', {})).toThrow(
          'Handler must have a process function'
        );
      });

      it('SHOULD throw error for handler with non-function process property', () => {
        expect(() => registerRuleHandler('test-rule', { process: 'not-a-function' })).toThrow(
          'Handler must have a process function'
        );
      });
    });
  });

  describe('WHEN getting a rule handler', () => {
    describe('AND WHEN handler is registered', () => {
      it('SHOULD return the registered handler', () => {
        const handler = { process: jest.fn() };
        registerRuleHandler('test-rule', handler);

        expect(getRuleHandler('test-rule')).toBe(handler);
      });

      it('SHOULD return built-in no-restricted-imports handler', () => {
        const handler = getRuleHandler('no-restricted-imports');
        expect(handler).toBeTruthy();
        expect(handler.ruleName).toBe('no-restricted-imports');
        expect(typeof handler.process).toBe('function');
      });
    });

    describe('AND WHEN handler is not registered', () => {
      it('SHOULD return null for unregistered rule', () => {
        expect(getRuleHandler('non-existent-rule')).toBe(null);
      });
    });
  });

  describe('WHEN clearing all handlers', () => {
    describe('AND WHEN handlers are registered', () => {
      it('SHOULD remove all registered handlers', () => {
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
  });

  describe('WHEN getting registered handlers list', () => {
    describe('AND WHEN handlers are registered', () => {
      it('SHOULD return list of all registered handler names', () => {
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
    });

    describe('AND WHEN no handlers are registered', () => {
      it('SHOULD return empty array after clearing', () => {
        clearHandlers();
        expect(getRegisteredHandlers()).toEqual([]);
      });
    });
  });
});
