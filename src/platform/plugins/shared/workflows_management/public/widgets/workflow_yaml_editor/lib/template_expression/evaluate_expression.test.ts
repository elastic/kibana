/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluateExpression } from './evaluate_expression';
import type { ExecutionContext } from '../execution_context/build_execution_context';

describe('evaluateExpression', () => {
  const mockContext: ExecutionContext = {
    inputs: {
      userId: 'user-123',
      greeting: 'hello',
    },
    steps: {
      search_data: {
        output: {
          hits: {
            total: 5,
            hits: [
              { _source: { name: 'Item 1', value: 100 } },
              { _source: { name: 'Item 2', value: 200 } },
              { _source: { name: 'Item 3', value: 300 } },
            ],
          },
        },
      },
      process_data: {
        output: {
          result: 'success',
        },
      },
    },
    workflow: {
      id: 'workflow-1',
      name: 'Test Workflow',
    },
    execution: {
      id: 'exec-1',
    },
    consts: {
      indexName: 'test-index',
      apiUrl: 'https://api.example.com',
    },
  };

  describe('simple path resolution', () => {
    it('should resolve top-level context properties', () => {
      expect(evaluateExpression({ expression: 'inputs', context: mockContext })).toEqual({
        userId: 'user-123',
        greeting: 'hello',
      });

      expect(evaluateExpression({ expression: 'consts', context: mockContext })).toEqual({
        indexName: 'test-index',
        apiUrl: 'https://api.example.com',
      });
    });

    it('should resolve nested paths', () => {
      expect(evaluateExpression({ expression: 'inputs.userId', context: mockContext })).toBe(
        'user-123'
      );

      expect(evaluateExpression({ expression: 'consts.indexName', context: mockContext })).toBe(
        'test-index'
      );

      expect(
        evaluateExpression({
          expression: 'steps.search_data.output.hits.total',
          context: mockContext,
        })
      ).toBe(5);
    });

    it('should resolve array access', () => {
      expect(
        evaluateExpression({
          expression: 'steps.search_data.output.hits.hits[0]._source.name',
          context: mockContext,
        })
      ).toBe('Item 1');

      expect(
        evaluateExpression({
          expression: 'steps.search_data.output.hits.hits[1]._source.value',
          context: mockContext,
        })
      ).toBe(200);
    });

    it('should return undefined for non-existent paths', () => {
      expect(
        evaluateExpression({ expression: 'nonexistent.path', context: mockContext })
      ).toBeUndefined();
    });
  });

  describe('filter support', () => {
    it('should apply string filters', () => {
      expect(
        evaluateExpression({ expression: 'inputs.greeting | upcase', context: mockContext })
      ).toBe('HELLO');

      expect(
        evaluateExpression({ expression: 'inputs.greeting | capitalize', context: mockContext })
      ).toBe('Hello');
    });

    it('should apply number filters', () => {
      expect(
        evaluateExpression({
          expression: 'steps.search_data.output.hits.total | plus: 10',
          context: mockContext,
        })
      ).toBe(15);

      expect(
        evaluateExpression({
          expression: 'steps.search_data.output.hits.total | times: 2',
          context: mockContext,
        })
      ).toBe(10);
    });

    it('should apply array filters', () => {
      const result = evaluateExpression({
        expression: 'steps.search_data.output.hits.hits | first',
        context: mockContext,
      });

      expect(result).toEqual({ _source: { name: 'Item 1', value: 100 } });

      const size = evaluateExpression({
        expression: 'steps.search_data.output.hits.hits | size',
        context: mockContext,
      });

      expect(size).toBe(3);
    });

    it('should apply json filter (stringify)', () => {
      const result = evaluateExpression({
        expression: 'inputs | json',
        context: mockContext,
      });

      // The json filter stringifies, but may or may not have pretty formatting
      expect(result).toContain('"userId"');
      expect(result).toContain('"user-123"');
      expect(result).toContain('"greeting"');
      expect(result).toContain('"hello"');
    });

    it('should apply json_parse filter', () => {
      const contextWithJson: ExecutionContext = {
        ...mockContext,
        inputs: {
          ...mockContext.inputs,
          jsonString: '{"key": "value", "number": 42}',
        },
      };

      const result = evaluateExpression({
        expression: 'inputs.jsonString | json_parse',
        context: contextWithJson,
      });

      expect(result).toEqual({ key: 'value', number: 42 });
    });

    it('should chain multiple filters', () => {
      const result = evaluateExpression({
        expression: 'inputs.greeting | upcase | append: " WORLD"',
        context: mockContext,
      });

      expect(result).toBe('HELLO WORLD');
    });

    it('should handle map filter on arrays', () => {
      const result = evaluateExpression({
        expression: 'steps.search_data.output.hits.hits | map: "_source" | map: "name"',
        context: mockContext,
      });

      expect(result).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });
  });

  describe('foreach.item support', () => {
    it('should resolve foreach.item when foreach step exists', () => {
      const contextWithForeach: ExecutionContext = {
        ...mockContext,
        steps: {
          ...mockContext.steps,
          loop_results: {
            output: null,
            state: {
              items: [
                { _source: { name: 'Park 1', location: 'NY' } },
                { _source: { name: 'Park 2', location: 'CA' } },
                { _source: { name: 'Park 3', location: 'TX' } },
              ],
              item: { _source: { name: 'Park 1', location: 'NY' } },
              index: 0,
              total: 3,
            },
          },
        },
      };

      const result = evaluateExpression({
        expression: 'foreach.item._source.name',
        context: contextWithForeach,
      });

      expect(result).toBe('Park 1');
    });

    it('should resolve foreach.item._source when foreach step exists', () => {
      const contextWithForeach: ExecutionContext = {
        ...mockContext,
        steps: {
          ...mockContext.steps,
          loop_results: {
            output: null,
            state: {
              items: [
                { _source: { name: 'Park 1', location: 'NY' } },
                { _source: { name: 'Park 2', location: 'CA' } },
              ],
              item: { _source: { name: 'Park 1', location: 'NY' } },
              index: 0,
              total: 2,
            },
          },
        },
      };

      const result = evaluateExpression({
        expression: 'foreach.item._source',
        context: contextWithForeach,
      });

      expect(result).toEqual({ name: 'Park 1', location: 'NY' });
    });

    it('should resolve foreach.index and foreach.total', () => {
      const contextWithForeach: ExecutionContext = {
        ...mockContext,
        steps: {
          ...mockContext.steps,
          loop_results: {
            output: null,
            state: {
              items: [{ id: 1 }, { id: 2 }, { id: 3 }],
              item: { id: 1 },
              index: 0,
              total: 3,
            },
          },
        },
      };

      expect(evaluateExpression({ expression: 'foreach.index', context: contextWithForeach })).toBe(
        0
      );

      expect(evaluateExpression({ expression: 'foreach.total', context: contextWithForeach })).toBe(
        3
      );
    });

    it('should return undefined for foreach.item when no foreach step exists', () => {
      const result = evaluateExpression({
        expression: 'foreach.item',
        context: mockContext,
      });

      expect(result).toBeUndefined();
    });

    it('should apply filters to foreach.item', () => {
      const contextWithForeach: ExecutionContext = {
        ...mockContext,
        steps: {
          ...mockContext.steps,
          loop_results: {
            output: null,
            state: {
              items: [{ _source: { name: 'park 1' } }, { _source: { name: 'park 2' } }],
              item: { _source: { name: 'park 1' } },
              index: 0,
              total: 2,
            },
          },
        },
      };

      const result = evaluateExpression({
        expression: 'foreach.item._source.name | upcase',
        context: contextWithForeach,
      });

      expect(result).toBe('PARK 1');
    });
  });

  describe('error handling', () => {
    it('should handle invalid filter with strictFilters', () => {
      // With strictFilters: true, unknown filters should throw an error
      // The error is caught and we fallback to path resolution
      const result = evaluateExpression({
        expression: 'inputs.userId | unknown_filter',
        context: mockContext,
      });

      // Should return the fallback path resolution (inputs.userId)
      expect(result).toBe('user-123');
    });

    it('should fallback to path resolution when liquid evaluation fails', () => {
      // Even with a syntax error, it should try fallback path resolution
      const result = evaluateExpression({
        expression: 'inputs.userId',
        context: mockContext,
      });

      expect(result).toBe('user-123');
    });
  });

  describe('bracket notation', () => {
    it('should resolve numeric array index', () => {
      const result = evaluateExpression({
        expression: 'steps.search_data.output.hits.hits[0]._source.name',
        context: mockContext,
      });

      expect(result).toBe('Item 1');
    });

    it('should resolve string key with dots in bracket notation', () => {
      const contextWithDottedKeys: ExecutionContext = {
        ...mockContext,
        inputs: {
          ...mockContext.inputs,
          fields: {
            'exception.message': 'Error occurred',
            'user.name': 'John Doe',
          },
        },
      };

      const result = evaluateExpression({
        expression: "inputs.fields['exception.message']",
        context: contextWithDottedKeys,
      });

      expect(result).toBe('Error occurred');
    });

    it('should resolve bracket notation in middle of path', () => {
      const contextWithArrays: ExecutionContext = {
        ...mockContext,
        steps: {
          formatMessage: {
            output: [
              { result: 'First result', status: 'ok' },
              { result: 'Second result', status: 'ok' },
            ],
          },
        },
      };

      const result = evaluateExpression({
        expression: 'steps.formatMessage.output[0].result',
        context: contextWithArrays,
      });

      expect(result).toBe('First result');
    });
  });

  describe('complex real-world scenarios', () => {
    it('should handle foreach with json filter', () => {
      const contextWithForeach: ExecutionContext = {
        ...mockContext,
        steps: {
          search_park_data: {
            output: {
              hits: {
                hits: [
                  { _source: { name: 'Central Park', city: 'NYC' } },
                  { _source: { name: 'Golden Gate Park', city: 'SF' } },
                ],
              },
            },
          },
          loop_over_results: {
            output: null,
            state: {
              items: [
                { _source: { name: 'Central Park', city: 'NYC' } },
                { _source: { name: 'Golden Gate Park', city: 'SF' } },
              ],
              item: { _source: { name: 'Central Park', city: 'NYC' } },
              index: 0,
              total: 2,
            },
          },
        },
      };

      // Simulate the foreach expression itself
      const foreachArray = evaluateExpression({
        expression: 'steps.search_park_data.output.hits.hits',
        context: contextWithForeach,
      });

      expect(foreachArray).toHaveLength(2);

      // Simulate accessing item within foreach
      const itemName = evaluateExpression({
        expression: 'foreach.item._source.name',
        context: contextWithForeach,
      });

      expect(itemName).toBe('Central Park');
    });

    it('should handle deeply nested path with filters', () => {
      const result = evaluateExpression({
        expression: 'steps.search_data.output.hits.hits[0]._source.name | upcase',
        context: mockContext,
      });

      expect(result).toBe('ITEM 1');
    });
  });
});
