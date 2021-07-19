/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { KibanaServerExecutionContext } from './execution_context_service';
import {
  ExecutionContextContainer,
  getParentContextFrom,
  BAGGAGE_HEADER,
  BAGGAGE_MAX_PER_NAME_VALUE_PAIRS,
} from './execution_context_container';

describe('KibanaExecutionContext', () => {
  describe('toString', () => {
    it('returns a string representation of provided execution context', () => {
      const context: KibanaServerExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'test-descripton',
        requestId: '1234-5678',
      };

      const value = new ExecutionContextContainer(context).toString();
      expect(value).toMatchInlineSnapshot(`"1234-5678;kibana:test-type:42"`);
    });

    it('returns a limited representation if optional properties are omitted', () => {
      const context: KibanaServerExecutionContext = {
        requestId: '1234-5678',
      };

      const value = new ExecutionContextContainer(context).toString();
      expect(value).toMatchInlineSnapshot(`"1234-5678"`);
    });

    it('trims a string representation of provided execution context if it is bigger max allowed size', () => {
      expect(
        new Blob([
          new ExecutionContextContainer({
            requestId: '1234-5678'.repeat(1000),
          }).toString(),
        ]).size
      ).toBeLessThanOrEqual(BAGGAGE_MAX_PER_NAME_VALUE_PAIRS);

      expect(
        new Blob([
          new ExecutionContextContainer({
            type: 'test-type'.repeat(1000),
            name: 'test-name',
            id: '42'.repeat(1000),
            description: 'test-descripton',
            requestId: '1234-5678',
          }).toString(),
        ]).size
      ).toBeLessThanOrEqual(BAGGAGE_MAX_PER_NAME_VALUE_PAIRS);
    });
  });

  describe('toJSON', () => {
    it('returns a context object', () => {
      const context: KibanaServerExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'test-descripton',
        requestId: '1234-5678',
      };

      const value = new ExecutionContextContainer(context).toJSON();
      expect(value).toBe(context);
    });
  });
});

describe('getParentContextFrom', () => {
  it('decodes provided header', () => {
    const ctx = { id: '42' };
    const header = encodeURIComponent(JSON.stringify(ctx));
    expect(getParentContextFrom({ [BAGGAGE_HEADER]: header })).toEqual(ctx);
  });

  it('does not throw an exception if given not a valid value', () => {
    expect(getParentContextFrom({ [BAGGAGE_HEADER]: 'value' })).toBeUndefined();
    expect(getParentContextFrom({ [BAGGAGE_HEADER]: '' })).toBeUndefined();
    expect(getParentContextFrom({})).toBeUndefined();

    const ctx = { id: '42' };
    const header = encodeURIComponent(JSON.stringify(ctx));
    expect(getParentContextFrom({ [BAGGAGE_HEADER]: header.slice(0, -2) })).toBeUndefined();
  });
});
