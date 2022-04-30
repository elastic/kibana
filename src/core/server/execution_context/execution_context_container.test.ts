/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { KibanaExecutionContext } from '../../types';

import {
  ExecutionContextContainer,
  getParentContextFrom,
  BAGGAGE_HEADER,
  BAGGAGE_MAX_PER_NAME_VALUE_PAIRS,
} from './execution_context_container';

describe('KibanaExecutionContext', () => {
  describe('constructor', () => {
    it('allows context be defined without a parent', () => {
      const parentContext: KibanaExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'parent-descripton',
      };
      const container = new ExecutionContextContainer(parentContext);

      const value = container.toJSON();
      expect(value.child).toBeUndefined();
    });

    it('allows context to be called with parent explicitly', () => {
      const parentContext: KibanaExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'parent-descripton',
      };
      const parentContainer = new ExecutionContextContainer(parentContext);

      const context: KibanaExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'test-descripton',
        child: {
          type: 'custom-child-type',
          name: 'custom-child-name',
          id: '41',
          description: 'custom-child-descripton',
        },
      };

      const value = new ExecutionContextContainer(context, parentContainer).toJSON();
      expect(value.id).toEqual(parentContext.id);
      expect(value.child).toEqual(context);
    });
  });

  describe('toString', () => {
    it('returns a string representation of provided execution context', () => {
      const context: KibanaExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'test-descripton',
      };

      const value = new ExecutionContextContainer(context).toString();
      expect(value).toBe('test-type:test-name:42');
    });

    it('includes a child context to string representation', () => {
      const context: KibanaExecutionContext = {
        type: 'type',
        name: 'name',
        id: '41',
        description: 'descripton',
      };

      const childContext: KibanaExecutionContext = {
        type: 'child-test-type',
        name: 'child-test-name',
        id: '42',
        description: 'test-descripton',
      };

      const contextContainer = new ExecutionContextContainer(context);

      const value = new ExecutionContextContainer(childContext, contextContainer).toString();
      expect(value).toBe('type:name:41;child-test-type:child-test-name:42');
    });

    it('returns an escaped string representation of provided execution context', () => {
      const context: KibanaExecutionContext = {
        id: 'Visualization☺漢字',
        type: 'test☺type',
        name: 'test漢name',
        description: 'test字description',
      };

      const value = new ExecutionContextContainer(context).toString();
      expect(value).toBe(
        'test%E2%98%BAtype:test%E6%BC%A2name:Visualization%E2%98%BA%E6%BC%A2%E5%AD%97'
      );
    });

    it('returns an escaped string representation of provided execution context parent', () => {
      const parentContext: KibanaExecutionContext = {
        id: 'Dashboard☺漢字',
        type: 'test☺type',
        name: 'test漢name',
        description: 'parent-descripton',
      };
      const parentContainer = new ExecutionContextContainer(parentContext);

      const context: KibanaExecutionContext = {
        id: 'Visualization',
        type: 'test-type',
        name: 'test-name',
        description: 'test-description',
      };

      const value = new ExecutionContextContainer(context, parentContainer).toString();
      expect(value).toBe(
        'test%E2%98%BAtype:test%E6%BC%A2name:Dashboard%E2%98%BA%E6%BC%A2%E5%AD%97;test-type:test-name:Visualization'
      );
    });

    it('trims a string representation of provided execution context if it is bigger max allowed size', () => {
      expect(
        new Blob([
          new ExecutionContextContainer({
            type: 'test-type'.repeat(1000),
            name: 'test-name',
            id: '42'.repeat(1000),
            description: 'test-descripton',
          }).toString(),
        ]).size
      ).toBeLessThanOrEqual(BAGGAGE_MAX_PER_NAME_VALUE_PAIRS);
    });
  });

  describe('toJSON', () => {
    it('returns a context object', () => {
      const context: KibanaExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'test-descripton',
      };

      const value = new ExecutionContextContainer(context).toJSON();
      expect(value).toEqual(context);
    });

    it('returns a context object with registered context object', () => {
      const context: KibanaExecutionContext = {
        type: 'type',
        name: 'name',
        id: '41',
        description: 'descripton',
      };

      const childContext: KibanaExecutionContext = {
        type: 'child-test-type',
        name: 'child-test-name',
        id: '42',
        description: 'test-descripton',
      };
      const contextContainer = new ExecutionContextContainer(context);

      const value = new ExecutionContextContainer(childContext, contextContainer).toJSON();
      expect(value).toEqual({ child: childContext, ...context });
    });
  });
});

describe('getParentContextFrom', () => {
  it('decodes provided header', () => {
    const ctx = { id: '42' };
    const header = encodeURIComponent(JSON.stringify(ctx));
    expect(getParentContextFrom({ [BAGGAGE_HEADER]: header })).toEqual(ctx);
  });

  it('does not throw an exception if given not a valid JSON object', () => {
    expect(getParentContextFrom({ [BAGGAGE_HEADER]: 'value' })).toBeUndefined();
    expect(getParentContextFrom({ [BAGGAGE_HEADER]: '' })).toBeUndefined();
    expect(getParentContextFrom({})).toBeUndefined();

    const ctx = { id: '42' };
    const header = encodeURIComponent(JSON.stringify(ctx));
    expect(getParentContextFrom({ [BAGGAGE_HEADER]: header.slice(0, -2) })).toBeUndefined();
  });
});
