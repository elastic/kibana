/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import { getSignatureHelp } from '.';

jest.mock('../shared/columns_retrieval_helpers', () => ({
  getColumnsByTypeRetriever: jest.fn(),
}));

import { getColumnsByTypeRetriever } from '../shared/columns_retrieval_helpers';

const mockGetColumnsByTypeRetriever = getColumnsByTypeRetriever as jest.MockedFunction<
  typeof getColumnsByTypeRetriever
>;

describe('getSignatureHelp', () => {
  const mockCallbacks: ESQLCallbacks = {
    getSources: jest.fn(),
    getColumnsFor: jest.fn(),
    getEditorExtensions: jest.fn(),
    getHistoryStarredItems: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the column retrieval to return an empty map by default
    mockGetColumnsByTypeRetriever.mockReturnValue({
      getColumnsByType: jest.fn().mockResolvedValue(new Map()),
      getColumnMap: jest.fn().mockResolvedValue(new Map()),
    });
  });

  describe('function detection', () => {
    it('should return undefined when cursor is not inside a function', async () => {
      const query = 'FROM logs | WHERE field == "value"';
      const offset = 5; // Inside "FROM"

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result).toBeUndefined();
    });

    it('should return signature help when cursor is right after opening parenthesis', async () => {
      const query = 'FROM logs | STATS COUNT(';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result?.signatures[0].label).toContain('COUNT');
      expect(result?.activeParameter).toBe(0);
    });
  });

  describe('parameter highlighting', () => {
    it('should highlight first parameter when cursor is at the start', async () => {
      const query = 'FROM logs | EVAL result = ROUND(';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result?.activeParameter).toBe(0);
    });

    it('should highlight first parameter when cursor is within first argument', async () => {
      const query = 'FROM logs | EVAL result = ROUND(field';
      const offset = query.indexOf('field') + 2;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result?.activeParameter).toBe(0);
    });

    it('should highlight second parameter when cursor is after comma', async () => {
      const query = 'FROM logs | EVAL result = ROUND(field,';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result?.activeParameter).toBe(1);
    });

    it('should highlight second parameter when cursor is after comma with space', async () => {
      const query = 'FROM logs | EVAL result = ROUND(field, ';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result?.activeParameter).toBe(1);
    });

    it('should highlight second parameter when cursor is within second argument', async () => {
      const query = 'FROM logs | EVAL result = ROUND(field, 2';
      const offset = query.length - 1;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result?.activeParameter).toBe(1);
    });

    it('should handle functions with multiple parameters', async () => {
      const query = 'FROM logs | EVAL result = SUBSTRING(field, 0, ';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result).toBeDefined();
      expect(result?.activeParameter).toBe(2);
    });
  });

  describe('nested functions', () => {
    it('should provide signature for the innermost function containing the cursor', async () => {
      const query = 'FROM logs | EVAL result = ROUND(ABS(';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result?.signatures[0].label).toContain('ABS');
    });

    it('should provide signature for outer function when cursor is in outer function args', async () => {
      const query = 'FROM logs | EVAL result = ROUND(ABS(field),';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result?.signatures[0].label).toContain('ROUND');
    });
  });

  describe('signature content', () => {
    it('should display ccomplete signature if no argument has been provided', async () => {
      const query = 'FROM logs | STATS COUNT(';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result).toBeDefined();
      const signatureLabel = result?.signatures[0].label;
      expect(signatureLabel).toContain('COUNT(');
      expect(signatureLabel).toContain('field?:');
      expect(signatureLabel).toContain('): long');
      expect(signatureLabel).toMatch(/…\+\d+ more/);
    });

    it('should display filtered signature based on argument types', async () => {
      const columnsMap = new Map([['field1', { type: 'integer' }]]);

      mockGetColumnsByTypeRetriever.mockReturnValue({
        getColumnsByType: jest.fn().mockResolvedValue(new Map()),
        getColumnMap: jest.fn().mockResolvedValue(columnsMap),
      });

      const query = 'FROM logs | EVAL result = COUNT(field1';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result).toBeDefined();
      expect(result?.signatures[0].label).toBe(`COUNT(
  field?:integer
): long`);
    });
  });

  describe('variadic functions', () => {
    it('should handle variadic functions with multiple arguments', async () => {
      const query = 'FROM logs | EVAL result = COALESCE(field1, field2, field3,';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result?.signatures[0].label).toContain('COALESCE');
      // activeParameter should be capped at the number of defined parameters
      expect(result?.activeParameter).toBe(1);
    });
  });

  describe('PromQL functions', () => {
    it('should return signature help for PromQL function without parens wrapper', async () => {
      const query = 'PROMQL rate(';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result).toBeDefined();
      expect(result?.signatures[0].label).toContain('rate');
      expect(result?.activeParameter).toBe(0);
    });

    it('should return signature help with label and description for PromQL function', async () => {
      const query = 'PROMQL step="5m" (rate(';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result).toBeDefined();
      expect(result?.signatures[0].label).toContain('rate');
      expect(result?.signatures[0].label).toContain('range_vector');
      expect(result?.signatures[0].documentation).toContain('per-second');
      expect(result?.activeParameter).toBe(0);
    });

    it('should keep signature help after a trailing comma', async () => {
      const query = 'PROMQL step="5m" round(bytes, ';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result).toBeDefined();
      expect(result?.signatures[0].label).toContain('round');
      expect(result?.activeParameter).toBe(1);
    });

    it('should return signature help for the innermost PromQL function', async () => {
      const query = 'PROMQL step="5m" (sum(rate(bytes[5m])))';
      const offset = query.indexOf('rate(') + 'rate('.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result).toBeDefined();
      expect(result?.signatures[0].label).toContain('rate');
    });

    it('should return innermost function after comma in nested function', async () => {
      const query = 'PROMQL step="5m" sum(quantile_over_time(0.9,';
      const offset = query.length;

      const result = await getSignatureHelp(query, offset, mockCallbacks);

      expect(result).toBeDefined();
      expect(result?.signatures[0].label).toContain('quantile_over_time');
      expect(result?.activeParameter).toBe(1);
    });
  });

  it('should return signature help for PromQL assignment form', async () => {
    const query = 'PROMQL col0 = (rate(';
    const offset = query.length;

    const result = await getSignatureHelp(query, offset, mockCallbacks);

    expect(result).toBeDefined();
    expect(result?.signatures[0].label).toContain('rate');
    expect(result?.activeParameter).toBe(0);
  });
});
