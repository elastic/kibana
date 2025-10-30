/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ConnectorContractUnion,
  ConnectorTypeInfo,
  DynamicConnectorContract,
} from '@kbn/workflows';
import { z } from '@kbn/zod';
import {
  extractActualSchema,
  extractPropertiesFromSchema,
  extractSchemaProperties,
  findConnector,
  getCommonUnionProperties,
  getConnectorParamsSchema,
  processDiscriminatedUnionSchema,
  processIntersectionSchema,
  processObjectSchema,
  processUnionSchema,
} from './get_connector_with_schema';
import * as connectorsCache from '../../../connectors_cache';

// Mock the connectors cache module
jest.mock('../../../connectors_cache');

// Helper to create mock connectors
function createMockConnector(type: string, paramsSchema: z.ZodType): DynamicConnectorContract {
  return {
    type,
    paramsSchema,
    outputSchema: z.object({}),
    actionTypeId: type,
    instances: [],
  } as DynamicConnectorContract;
}

describe('get_connector_with_schema', () => {
  beforeEach(() => {
    // Clear module cache to reset the internal Map
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('Unit tests for individual functions', () => {
    describe('getCachedSchema and setCachedSchema', () => {
      it('should return undefined for non-cached schema', async () => {
        // Import fresh module to get clean cache
        const module = await import('./get_connector_with_schema');
        const { getCachedSchema: getSchema } = module;

        expect(getSchema('non-existent')).toBeUndefined();
      });

      it('should cache and retrieve schema correctly', async () => {
        const module = await import('./get_connector_with_schema');
        const { getCachedSchema: getSchema, setCachedSchema: setSchema } = module;

        const testSchema = { field: z.string() };
        setSchema('test-type', testSchema);

        expect(getSchema('test-type')).toBe(testSchema);
      });

      it('should cache null values', async () => {
        const module = await import('./get_connector_with_schema');
        const { getCachedSchema: getSchema, setCachedSchema: setSchema } = module;

        setSchema('null-type', null);

        expect(getSchema('null-type')).toBeNull();
      });
    });

    describe('findConnector', () => {
      it('should find connector from cache', () => {
        const mockConnectors: ConnectorContractUnion[] = [
          createMockConnector('slack', z.object({})),
          createMockConnector('email', z.object({})),
        ];
        const dynamicConnectorTypes = {
          slack: {} as ConnectorTypeInfo,
          email: {} as ConnectorTypeInfo,
        };

        jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

        const result = findConnector('email', dynamicConnectorTypes);
        expect(result?.type).toEqual('email');
      });

      it('should return undefined for non-existent connector', () => {
        jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue([]);

        const result = findConnector('non-existent', {});
        expect(result).toBeUndefined();
      });

      it('should pass dynamic connector types', () => {
        const dynamicTypes = { custom: {} as ConnectorTypeInfo };
        jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue([]);

        findConnector('test', dynamicTypes);
        expect(connectorsCache.getCachedAllConnectors).toHaveBeenCalledWith(dynamicTypes);
      });
    });

    describe('extractActualSchema', () => {
      it('should return schema directly if not a function', () => {
        const schema = z.object({ test: z.string() });
        const result = extractActualSchema(schema);
        expect(result).toBe(schema);
      });

      it('should execute function to get schema', () => {
        const schema = z.object({ test: z.string() });
        const schemaFn = jest.fn(() => schema);

        const result = extractActualSchema(schemaFn);
        expect(schemaFn).toHaveBeenCalled();
        expect(result).toBe(schema);
      });

      it('should return null if function throws', () => {
        const schemaFn = jest.fn(() => {
          throw new Error('Schema generation failed');
        });

        const result = extractActualSchema(schemaFn);
        expect(result).toBeNull();
      });

      it('should handle null input', () => {
        const result = extractActualSchema(null);
        expect(result).toBeNull();
      });
    });

    describe('extractPropertiesFromSchema', () => {
      it('should extract properties from ZodObject', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const result = extractPropertiesFromSchema(schema);
        expect(result).toEqual({
          name: expect.any(z.ZodString),
          age: expect.any(z.ZodNumber),
        });
      });

      it('should extract properties from ZodIntersection', () => {
        const schema = z.intersection(
          z.object({ field1: z.string() }),
          z.object({ field2: z.number() })
        );

        const result = extractPropertiesFromSchema(schema);
        expect(result).toEqual({
          field1: expect.any(z.ZodString),
          field2: expect.any(z.ZodNumber),
        });
      });

      it('should handle nested intersections', () => {
        const schema = z.intersection(
          z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() })),
          z.object({ c: z.boolean() })
        );

        const result = extractPropertiesFromSchema(schema);
        expect(result).toEqual({
          a: expect.any(z.ZodString),
          b: expect.any(z.ZodNumber),
          c: expect.any(z.ZodBoolean),
        });
      });

      it('should return empty object for unsupported types', () => {
        const schema = z.array(z.string());
        const result = extractPropertiesFromSchema(schema);
        expect(result).toEqual({});
      });
    });

    describe('getCommonUnionProperties', () => {
      it('should find common properties across all options', () => {
        const options = [
          z.object({ common: z.string(), unique1: z.number() }),
          z.object({ common: z.string(), unique2: z.boolean() }),
        ];

        const result = getCommonUnionProperties(options);
        expect(result).toEqual({
          common: expect.any(z.ZodString),
        });
      });

      it('should return empty object for no common properties', () => {
        const options = [z.object({ field1: z.string() }), z.object({ field2: z.number() })];

        const result = getCommonUnionProperties(options);
        expect(result).toEqual({});
      });

      it('should handle empty options array', () => {
        const result = getCommonUnionProperties([]);
        expect(result).toEqual({});
      });

      it('should handle single option', () => {
        const options = [z.object({ field: z.string() })];

        const result = getCommonUnionProperties(options);
        expect(result).toEqual({
          field: expect.any(z.ZodString),
        });
      });

      it('should work with intersection types in options', () => {
        const options = [
          z.intersection(z.object({ common: z.string() }), z.object({ extra1: z.number() })),
          z.intersection(z.object({ common: z.string() }), z.object({ extra2: z.boolean() })),
        ];

        const result = getCommonUnionProperties(options);
        expect(result).toEqual({
          common: expect.any(z.ZodString),
        });
      });
    });

    describe('processObjectSchema', () => {
      it('should return shape of ZodObject', () => {
        const schema = z.object({
          field1: z.string(),
          field2: z.number(),
        });

        const result = processObjectSchema(schema);
        expect(result).toEqual({
          field1: expect.any(z.ZodString),
          field2: expect.any(z.ZodNumber),
        });
      });
    });

    describe('processUnionSchema', () => {
      it('should return common properties from union', () => {
        const schema = z.union([
          z.object({ common: z.string(), unique1: z.number() }),
          z.object({ common: z.string(), unique2: z.boolean() }),
        ]);

        const result = processUnionSchema(schema);
        expect(result).toEqual({
          common: expect.any(z.ZodString),
        });
      });

      it('should return null for no common properties', () => {
        const schema = z.union([
          z.object({ field1: z.string() }),
          z.object({ field2: z.number() }),
        ]);

        const result = processUnionSchema(schema);
        expect(result).toBeNull();
      });
    });

    describe('processIntersectionSchema', () => {
      it('should merge properties from intersection', () => {
        const schema = z.intersection(
          z.object({ field1: z.string() }),
          z.object({ field2: z.number() })
        );

        const result = processIntersectionSchema(schema);
        expect(result).toEqual({
          field1: expect.any(z.ZodString),
          field2: expect.any(z.ZodNumber),
        });
      });

      it('should return null for empty properties', () => {
        const schema = z.intersection(z.array(z.string()), z.array(z.number()));

        const result = processIntersectionSchema(schema);
        expect(result).toBeNull();
      });
    });

    describe('processDiscriminatedUnionSchema', () => {
      it('should find common properties in discriminated union', () => {
        const schema = z.discriminatedUnion('type', [
          z.object({ type: z.literal('a'), common: z.string(), uniqueA: z.number() }),
          z.object({ type: z.literal('b'), common: z.string(), uniqueB: z.boolean() }),
        ]);

        const result = processDiscriminatedUnionSchema(schema);
        expect(result).toEqual({
          type: expect.any(z.ZodLiteral),
          common: expect.any(z.ZodString),
        });
      });
    });

    describe('extractSchemaProperties', () => {
      it('should handle ZodObject', () => {
        const schema = z.object({ field: z.string() });
        const result = extractSchemaProperties(schema);
        expect(result).toEqual({ field: expect.any(z.ZodString) });
      });

      it('should handle ZodUnion', () => {
        const schema = z.union([
          z.object({ common: z.string() }),
          z.object({ common: z.string(), extra: z.number() }),
        ]);
        const result = extractSchemaProperties(schema);
        expect(result).toEqual({ common: expect.any(z.ZodString) });
      });

      it('should handle ZodIntersection', () => {
        const schema = z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() }));
        const result = extractSchemaProperties(schema);
        expect(result).toEqual({
          a: expect.any(z.ZodString),
          b: expect.any(z.ZodNumber),
        });
      });

      it('should handle ZodDiscriminatedUnion', () => {
        const schema = z.discriminatedUnion('type', [
          z.object({ type: z.literal('a'), common: z.string() }),
          z.object({ type: z.literal('b'), common: z.string() }),
        ]);
        const result = extractSchemaProperties(schema);
        expect(result).toEqual({
          type: expect.any(z.ZodLiteral),
          common: expect.any(z.ZodString),
        });
      });

      it('should return null for unsupported types', () => {
        const schema = z.array(z.string());
        const result = extractSchemaProperties(schema);
        expect(result).toBeNull();
      });
    });
  });

  describe('Integration tests - getCachedSchema and setCachedSchema', () => {
    it('should cache and retrieve schemas correctly', () => {
      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector(
          'test-connector',
          z.object({
            field1: z.string(),
            field2: z.number(),
          })
        ),
      ];
      const dynamicConnectorTypes = { 'test-connector': {} as ConnectorTypeInfo };

      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      // First call should fetch and cache
      const result1 = getConnectorParamsSchema('test-connector', dynamicConnectorTypes);
      expect(result1).toEqual({
        field1: expect.any(z.ZodString),
        field2: expect.any(z.ZodNumber),
      });

      // Second call should use cache (getCachedAllConnectors should only be called once)
      const result2 = getConnectorParamsSchema('test-connector', dynamicConnectorTypes);
      expect(result2).toEqual(result1);
      expect(connectorsCache.getCachedAllConnectors).toHaveBeenCalledTimes(1);
    });
  });

  describe('findConnector', () => {
    it('should find connector by type', () => {
      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector('slack', z.object({})),
        createMockConnector('email', z.object({})),
      ];
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
        email: {} as ConnectorTypeInfo,
      };

      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      getConnectorParamsSchema('slack', dynamicConnectorTypes);
      expect(connectorsCache.getCachedAllConnectors).toHaveBeenCalledWith(dynamicConnectorTypes);
    });

    it('should pass dynamic connector types to getCachedAllConnectors', () => {
      const dynamicTypes = { custom: {} as ConnectorTypeInfo };
      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue([]);

      getConnectorParamsSchema('test', dynamicTypes);
      expect(connectorsCache.getCachedAllConnectors).toHaveBeenCalledWith(dynamicTypes);
    });
  });

  describe('extractActualSchema', () => {
    it('should handle function-based schemas', () => {
      const schema = z.object({ test: z.string() });
      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector('function-schema', (() => schema) as unknown as z.ZodType),
      ];
      const dynamicConnectorTypes = { 'function-schema': {} as ConnectorTypeInfo };

      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('function-schema', dynamicConnectorTypes);
      expect(result).toEqual({
        test: expect.any(z.ZodString),
      });
    });

    it('should handle function schemas that throw errors', () => {
      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector('error-schema', (() => {
          throw new Error('Schema generation failed');
        }) as unknown as z.ZodType),
      ];
      const dynamicConnectorTypes = { 'error-schema': {} as ConnectorTypeInfo };

      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('error-schema', dynamicConnectorTypes);
      expect(result).toBeNull();
    });

    it('should handle direct schema objects', () => {
      const schema = z.object({ direct: z.boolean() });
      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector('direct-schema', schema),
      ];
      const dynamicConnectorTypes = { 'direct-schema': {} as ConnectorTypeInfo };

      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('direct-schema', dynamicConnectorTypes);
      expect(result).toEqual({
        direct: expect.any(z.ZodBoolean),
      });
    });
  });

  describe('extractPropertiesFromSchema', () => {
    it('should extract properties from ZodObject', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector('object-schema', schema),
      ];
      const dynamicConnectorTypes = { 'object-schema': {} as ConnectorTypeInfo };

      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('object-schema', dynamicConnectorTypes);
      expect(result).toEqual({
        name: expect.any(z.ZodString),
        age: expect.any(z.ZodNumber),
      });
    });

    it('should extract properties from ZodIntersection', () => {
      const schema = z.intersection(
        z.object({ field1: z.string() }),
        z.object({ field2: z.number() })
      );

      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector('intersection-schema', schema),
      ];
      const dynamicConnectorTypes = { 'intersection-schema': {} as ConnectorTypeInfo };

      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('intersection-schema', dynamicConnectorTypes);
      expect(result).toEqual({
        field1: expect.any(z.ZodString),
        field2: expect.any(z.ZodNumber),
      });
    });

    it('should handle nested intersections', () => {
      const schema = z.intersection(
        z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() })),
        z.object({ c: z.boolean() })
      );

      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector('nested-intersection', schema),
      ];
      const dynamicConnectorTypes = { 'nested-intersection': {} as ConnectorTypeInfo };

      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('nested-intersection', dynamicConnectorTypes);
      expect(result).toEqual({
        a: expect.any(z.ZodString),
        b: expect.any(z.ZodNumber),
        c: expect.any(z.ZodBoolean),
      });
    });
  });

  describe('getCommonUnionProperties', () => {
    it('should find common properties in union schemas', () => {
      const schema = z.union([
        z.object({ common: z.string(), unique1: z.number() }),
        z.object({ common: z.string(), unique2: z.boolean() }),
      ]);

      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector('union-schema', schema),
      ];
      const dynamicConnectorTypes = { 'union-schema': {} as ConnectorTypeInfo };
      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('union-schema', dynamicConnectorTypes);
      expect(result).toEqual({
        common: expect.any(z.ZodString),
      });
    });

    it('should return null for union with no common properties', () => {
      const schema = z.union([z.object({ field1: z.string() }), z.object({ field2: z.number() })]);

      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector('union-no-common', schema),
      ];
      const dynamicConnectorTypes = { 'union-no-common': {} as ConnectorTypeInfo };
      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('union-no-common', dynamicConnectorTypes);
      expect(result).toBeNull();
    });

    it('should handle empty union arrays', () => {
      // Create a mock union with empty options through internal manipulation
      const schema = z.union([z.object({}), z.object({})]);
      // Override the options to simulate empty union
      (schema as any)._def.options = [];

      const mockConnectors: ConnectorContractUnion[] = [createMockConnector('empty-union', schema)];
      const dynamicConnectorTypes = { 'empty-union': {} as ConnectorTypeInfo };

      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('empty-union', dynamicConnectorTypes);
      expect(result).toBeNull();
    });
  });

  describe('processDiscriminatedUnionSchema', () => {
    it('should find common properties in discriminated unions', () => {
      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('a'), common: z.string(), uniqueA: z.number() }),
        z.object({ type: z.literal('b'), common: z.string(), uniqueB: z.boolean() }),
      ]);

      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector('discriminated-union', schema),
      ];
      const dynamicConnectorTypes = { 'discriminated-union': {} as ConnectorTypeInfo };
      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('discriminated-union', dynamicConnectorTypes);
      expect(result).toEqual({
        type: expect.any(z.ZodLiteral),
        common: expect.any(z.ZodString),
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should return null for non-existent connector', () => {
      const dynamicConnectorTypes = {};
      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue([]);

      const result = getConnectorParamsSchema('non-existent', dynamicConnectorTypes);
      expect(result).toBeNull();
    });

    it('should return null for connector without paramsSchema', () => {
      const mockConnectors: ConnectorContractUnion[] = [
        {
          type: 'no-params',
          outputSchema: z.object({}),
          actionTypeId: 'no-params',
          instances: [],
          paramsSchema: undefined,
        } as unknown as DynamicConnectorContract,
      ];
      const dynamicConnectorTypes = { 'no-params': {} as ConnectorTypeInfo };

      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('no-params', dynamicConnectorTypes);
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', () => {
      jest.mocked(connectorsCache.getCachedAllConnectors).mockImplementation(() => {
        throw new Error('Cache error');
      });

      const dynamicConnectorTypes = {};
      const result = getConnectorParamsSchema('error-case', dynamicConnectorTypes);
      expect(result).toBeNull();
    });

    it('should return null for unsupported schema types', () => {
      const schema = z.array(z.string()); // Array is not a supported schema type

      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector('unsupported-schema', schema),
      ];
      const dynamicConnectorTypes = { 'unsupported-schema': {} as ConnectorTypeInfo };
      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('unsupported-schema', dynamicConnectorTypes);
      expect(result).toBeNull();
    });
  });

  describe('complex union with intersections', () => {
    it('should handle union of intersections', () => {
      const schema = z.union([
        z.intersection(z.object({ base: z.string() }), z.object({ extra1: z.number() })),
        z.intersection(z.object({ base: z.string() }), z.object({ extra2: z.boolean() })),
      ]);

      const mockConnectors: ConnectorContractUnion[] = [
        createMockConnector('union-intersections', schema),
      ];
      const dynamicConnectorTypes = { 'union-intersections': {} as ConnectorTypeInfo };
      jest.mocked(connectorsCache.getCachedAllConnectors).mockReturnValue(mockConnectors);

      const result = getConnectorParamsSchema('union-intersections', dynamicConnectorTypes);
      expect(result).toEqual({
        base: expect.any(z.ZodString),
      });
    });
  });
});
