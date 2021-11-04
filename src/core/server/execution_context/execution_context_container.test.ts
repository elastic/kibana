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
    it('allows context to define parent explicitly', () => {
      const parentContext: KibanaExecutionContext = {
        type: 'parent-type',
        name: 'parent-name',
        id: '44',
        description: 'parent-descripton',
      };
      const parentContainer = new ExecutionContextContainer(parentContext);

      const context: KibanaExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'test-descripton',
        parent: {
          type: 'custom-parent-type',
          name: 'custom-parent-name',
          id: '41',
          description: 'custom-parent-descripton',
        },
      };

      const value = new ExecutionContextContainer(context, parentContainer).toJSON();
      expect(value).toEqual(context);
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

    it('includes a parent context to string representation', () => {
      const parentContext: KibanaExecutionContext = {
        type: 'parent-type',
        name: 'parent-name',
        id: '41',
        description: 'parent-descripton',
      };
      const parentContainer = new ExecutionContextContainer(parentContext);

      const context: KibanaExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'test-descripton',
      };

      const value = new ExecutionContextContainer(context, parentContainer).toString();
      expect(value).toBe('parent-type:parent-name:41;test-type:test-name:42');
    });

    it('returns an escaped string representation of provided execution contextStringified', () => {
      const context: KibanaExecutionContext = {
        id: 'Visualization☺漢字',
        type: 'test-type',
        name: 'test-name',
        description: 'test-description',
      };

      const value = new ExecutionContextContainer(context).toString();
      expect(value).toBe('test-type:test-name:Visualization%E2%98%BA%E6%BC%A2%E5%AD%97');
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

    it('returns a context object with registered parent object', () => {
      const parentContext: KibanaExecutionContext = {
        type: 'parent-type',
        name: 'parent-name',
        id: '41',
        description: 'parent-descripton',
      };
      const parentContainer = new ExecutionContextContainer(parentContext);

      const context: KibanaExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'test-descripton',
      };

      const value = new ExecutionContextContainer(context, parentContainer).toJSON();
      expect(value).toEqual({ ...context, parent: parentContext });
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
