/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type FunctionDefinition, FunctionDefinitionTypes } from '../../types';
import { getFormattedFunctionSignature } from './functions';
import type { ESQLFunction } from '../../../../types';
import type { ESQLColumnData } from '../../../registry/types';
import { exp } from '../../../../composer/synth';

describe('getFormattedFunctionSignature', () => {
  describe('basic function formatting', () => {
    it('should format a function with no parameters', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'now',
        description: 'Returns the current date and time',
        locationsAvailable: [],
        signatures: [
          {
            params: [],
            returnType: 'date',
          },
        ],
      };

      const result = getFormattedFunctionSignature(functionDef);
      expect(result).toBe(`NOW(): date`);
    });

    it('should format a function with a single parameter', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'abs',
        description: 'Returns the absolute value',
        locationsAvailable: [],
        signatures: [
          {
            params: [
              {
                name: 'number',
                type: 'double',
                optional: false,
              },
            ],
            returnType: 'double',
          },
        ],
      };

      const result = getFormattedFunctionSignature(functionDef);
      expect(result).toBe(`ABS(
  number:double
): double`);
    });

    it('should format a function with multiple parameters', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'substring',
        description: 'Returns a substring',
        locationsAvailable: [],
        signatures: [
          {
            params: [
              {
                name: 'string',
                type: 'keyword',
                optional: false,
              },
              {
                name: 'start',
                type: 'integer',
                optional: false,
              },
              {
                name: 'length',
                type: 'integer',
                optional: true,
              },
            ],
            returnType: 'keyword',
          },
        ],
      };

      const result = getFormattedFunctionSignature(functionDef);
      expect(result).toBe(
        `SUBSTRING(
  string:keyword,  
  start:integer,  
  length?:integer
): keyword`
      );
    });
  });

  describe('optional parameters handling', () => {
    it('should mark explicitly optional parameters with ?', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'test_func',
        description: 'Test function',
        locationsAvailable: [],
        signatures: [
          {
            params: [
              {
                name: 'required',
                type: 'keyword',
                optional: false,
              },
              {
                name: 'optional',
                type: 'integer',
                optional: true,
              },
            ],
            returnType: 'keyword',
          },
        ],
      };

      const result = getFormattedFunctionSignature(functionDef);
      expect(result).toBe(
        `TEST_FUNC(
  required:keyword,  
  optional?:integer
): keyword`
      );
    });

    it("should mark parameters as optional if they don't appear in all signatures", () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'test_func',
        description: 'Test function',
        locationsAvailable: [],
        signatures: [
          {
            params: [
              {
                name: 'field',
                type: 'keyword',
                optional: false,
              },
            ],
            returnType: 'keyword',
          },
          {
            params: [
              {
                name: 'field',
                type: 'keyword',
                optional: false,
              },
              {
                name: 'extra',
                type: 'integer',
                optional: false,
              },
            ],
            returnType: 'keyword',
          },
        ],
      };

      const result = getFormattedFunctionSignature(functionDef);
      expect(result).toBe(
        `TEST_FUNC(
  field:keyword,  
  extra?:integer
): keyword`
      );
    });
  });

  describe('multiple signatures handling', () => {
    it('should combine parameter types from multiple signatures', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'coalesce',
        description: 'Returns the first non-null value',
        locationsAvailable: [],
        signatures: [
          {
            params: [
              {
                name: 'first',
                type: 'keyword',
                optional: false,
              },
            ],
            returnType: 'keyword',
          },
          {
            params: [
              {
                name: 'first',
                type: 'integer',
                optional: false,
              },
            ],
            returnType: 'integer',
          },
        ],
      };

      const result = getFormattedFunctionSignature(functionDef);
      expect(result).toBe(
        `COALESCE(
  first:integer|keyword
): integer|keyword`
      );
    });

    it('should use the signature with the most parameters', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'test_func',
        description: 'Test function',
        locationsAvailable: [],
        signatures: [
          {
            params: [
              {
                name: 'param1',
                type: 'keyword',
                optional: false,
              },
            ],
            returnType: 'keyword',
          },
          {
            params: [
              {
                name: 'param1',
                type: 'keyword',
                optional: false,
              },
              {
                name: 'param2',
                type: 'integer',
                optional: false,
              },
              {
                name: 'param3',
                type: 'boolean',
                optional: false,
              },
            ],
            returnType: 'keyword',
          },
        ],
      };

      const result = getFormattedFunctionSignature(functionDef);
      expect(result).toBe(
        `TEST_FUNC(
  param1:keyword,  
  param2?:integer,  
  param3?:boolean
): keyword`
      );
    });

    it('should combine return types from multiple signatures', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'test_func',
        description: 'Test function',
        locationsAvailable: [],
        signatures: [
          {
            params: [
              {
                name: 'input',
                type: 'keyword',
                optional: false,
              },
            ],
            returnType: 'keyword',
          },
          {
            params: [
              {
                name: 'input',
                type: 'integer',
                optional: false,
              },
            ],
            returnType: 'double',
          },
        ],
      };

      const result = getFormattedFunctionSignature(functionDef);
      expect(result).toBe(
        `TEST_FUNC(
  input:integer|keyword
): double|keyword`
      );
    });
  });

  describe('signature filtering', () => {
    const createMockColumns = (
      columns: Array<{ name: string; type: string }>
    ): Map<string, ESQLColumnData> => {
      const columnMap = new Map<string, ESQLColumnData>();
      columns.forEach(({ name, type }) => {
        columnMap.set(name, {
          name,
          type: type as any,
          userDefined: false,
        });
      });
      return columnMap;
    };

    it('should filter signatures based on argument types', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'math_function',
        description: 'A function with multiple signatures',
        locationsAvailable: [],
        signatures: [
          {
            params: [{ name: 'input', type: 'integer', optional: false }],
            returnType: 'integer',
          },
          {
            params: [{ name: 'input', type: 'double', optional: false }],
            returnType: 'double',
          },
          {
            params: [{ name: 'input', type: 'keyword', optional: false }],
            returnType: 'keyword',
          },
        ],
      };

      const fnNode = exp`math_function(42)` as ESQLFunction;
      const columns = createMockColumns([]);

      const result = getFormattedFunctionSignature(functionDef, fnNode, columns);

      // Should only show the integer signature since we passed an integer literal
      expect(result).toBe(`MATH_FUNCTION(
  input:integer
): integer`);
    });

    it('should demonstrate signature filtering works with literals but may have limitations with columns', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'test_function',
        description: 'A test function',
        locationsAvailable: [],
        signatures: [
          {
            params: [{ name: 'input', type: 'integer', optional: false }],
            returnType: 'integer',
          },
          {
            params: [{ name: 'input', type: 'keyword', optional: false }],
            returnType: 'keyword',
          },
        ],
      };

      const fnNodeWithLiteral = exp`test_function(42)` as ESQLFunction;
      const columns = createMockColumns([{ name: 'my_field', type: 'integer' }]);

      const resultWithLiteral = getFormattedFunctionSignature(
        functionDef,
        fnNodeWithLiteral,
        columns
      );

      // This should  show only integer signature
      expect(resultWithLiteral).toBe(`TEST_FUNCTION(
  input:integer
): integer`);

      // Test without fnNode and columns - should show all signatures
      const resultWithoutFiltering = getFormattedFunctionSignature(functionDef);

      expect(resultWithoutFiltering).toBe(`TEST_FUNCTION(
  input:integer|keyword
): integer|keyword`);
    });

    it('should filter signatures based on column types when using a field', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'string_function',
        description: 'A function that works with strings',
        locationsAvailable: [],
        signatures: [
          {
            params: [{ name: 'input', type: 'keyword', optional: false }],
            returnType: 'keyword',
          },
          {
            params: [{ name: 'input', type: 'text', optional: false }],
            returnType: 'text',
          },
          {
            params: [{ name: 'input', type: 'integer', optional: false }],
            returnType: 'integer',
          },
        ],
      };

      const fnNode = exp`string_function(my_text_field)` as ESQLFunction;
      const columns = createMockColumns([
        { name: 'my_text_field', type: 'text' },
        { name: 'my_number_field', type: 'integer' },
      ]);

      const result = getFormattedFunctionSignature(functionDef, fnNode, columns);

      expect(result).toBe(`STRING_FUNCTION(
  input:keyword|text
): keyword|text`);
    });

    it('should filter signatures based on multiple arguments', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'multi_arg_function',
        description: 'A function with multiple arguments',
        locationsAvailable: [],
        signatures: [
          {
            params: [
              { name: 'first', type: 'integer', optional: false },
              { name: 'second', type: 'integer', optional: false },
            ],
            returnType: 'integer',
          },
          {
            params: [
              { name: 'first', type: 'keyword', optional: false },
              { name: 'second', type: 'keyword', optional: false },
            ],
            returnType: 'keyword',
          },
          {
            params: [
              { name: 'first', type: 'integer', optional: false },
              { name: 'second', type: 'keyword', optional: false },
            ],
            returnType: 'keyword',
          },
        ],
      };

      const fnNode = exp`multi_arg_function(42, my_text_field)` as ESQLFunction;
      const columns = createMockColumns([{ name: 'my_text_field', type: 'keyword' }]);

      const result = getFormattedFunctionSignature(functionDef, fnNode, columns);

      // Should only show the signature that matches integer + keyword
      expect(result).toBe(`MULTI_ARG_FUNCTION(
  first:integer,  
  second:keyword
): keyword`);
    });

    it('should fall back to all signatures if no matches are found', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'strict_function',
        description: 'A function with strict type requirements',
        locationsAvailable: [],
        signatures: [
          {
            params: [{ name: 'input', type: 'boolean', optional: false }],
            returnType: 'boolean',
          },
        ],
      };

      const fnNode = exp`strict_function("hello")` as ESQLFunction;
      const columns = createMockColumns([]);

      const result = getFormattedFunctionSignature(functionDef, fnNode, columns);

      expect(result).toBe(`STRICT_FUNCTION(
  input:boolean
): boolean`);
    });
  });

  describe('type list formatting with maxTypesToShow', () => {
    it('should limit types and show "+X more" when maxTypesToShow is exceeded by more than 1', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'test_func',
        description: 'Test function',
        locationsAvailable: [],
        signatures: [
          {
            params: [{ name: 'input', type: 'boolean', optional: false }],
            returnType: 'boolean',
          },
          {
            params: [{ name: 'input', type: 'date', optional: false }],
            returnType: 'date',
          },
          {
            params: [{ name: 'input', type: 'double', optional: false }],
            returnType: 'double',
          },
          {
            params: [{ name: 'input', type: 'integer', optional: false }],
            returnType: 'integer',
          },
          {
            params: [{ name: 'input', type: 'keyword', optional: false }],
            returnType: 'keyword',
          },
        ],
      };

      const result = getFormattedFunctionSignature(functionDef, undefined, undefined, undefined, 3);
      // Should show first 3 types + "+2 more"
      expect(result).toContain('boolean|date|double');
      expect(result).toContain('+2 more');
      expect(result).not.toContain('integer');
      expect(result).not.toContain('keyword');
    });

    it('should show the actual type instead of "+1 more" when only 1 type remains', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'test_func',
        description: 'Test function',
        locationsAvailable: [],
        signatures: [
          {
            params: [{ name: 'input', type: 'boolean', optional: false }],
            returnType: 'boolean',
          },
          {
            params: [{ name: 'input', type: 'date', optional: false }],
            returnType: 'date',
          },
          {
            params: [{ name: 'input', type: 'double', optional: false }],
            returnType: 'double',
          },
          {
            params: [{ name: 'input', type: 'integer', optional: false }],
            returnType: 'integer',
          },
        ],
      };

      const result = getFormattedFunctionSignature(functionDef, undefined, undefined, undefined, 3);
      // Should show all 4 types instead of "boolean | date | double|…+1 more"
      expect(result).toContain('boolean|date|double|integer');
      expect(result).not.toContain('+1 more');
    });

    it('should show exact count when maxTypesToShow equals the number of types', () => {
      const functionDef: FunctionDefinition = {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'test_func',
        description: 'Test function',
        locationsAvailable: [],
        signatures: [
          {
            params: [{ name: 'input', type: 'boolean', optional: false }],
            returnType: 'boolean',
          },
          {
            params: [{ name: 'input', type: 'date', optional: false }],
            returnType: 'date',
          },
          {
            params: [{ name: 'input', type: 'double', optional: false }],
            returnType: 'double',
          },
        ],
      };

      const result = getFormattedFunctionSignature(functionDef, undefined, undefined, undefined, 3);
      // Should show all types without "+more" indicator
      expect(result).toContain('boolean|date|double');
      expect(result).not.toContain('more');
    });
  });
});
