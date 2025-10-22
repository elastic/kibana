/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type FunctionDefinition, FunctionDefinitionTypes } from '../types';
import { getFormattedFunctionSignature } from './functions';

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
      expect(result).toBe(`now(): date`);
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
      expect(result).toBe(`abs (
  number: double
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
        `substring (
  string: keyword,  
  start: integer,  
  length?: integer
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
        `test_func (
  required: keyword,  
  optional?: integer
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
        `test_func (
  field: keyword,  
  extra?: integer
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
        `coalesce (
  first: integer | keyword
): integer | keyword`
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
        `test_func (
  param1: keyword,  
  param2?: integer,  
  param3?: boolean
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
        `test_func (
  input: integer | keyword
): double | keyword`
      );
    });
  });
});
