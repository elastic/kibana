/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { createProcessSchema } = require('./process_schema');
const testObjects = {
  simpleObject: {
    type: 'object',
    properties: {
      name: { type: 'string' },
    },
  },
  oneOfSchema: {
    oneOf: [
      { type: 'object', properties: { a: { type: 'string' } } },
      { type: 'object', properties: { b: { type: 'number' } } },
    ],
  },
  anyOfSchema: {
    anyOf: [{ type: 'string' }, { type: 'number' }],
  },
  allOfSchema: {
    allOf: [
      { type: 'object', properties: { base: { type: 'string' } } },
      { type: 'object', properties: { extended: { type: 'number' } } },
    ],
  },
  nestedProperties: {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      },
    },
  },
  arraySchema: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
    },
  },

  AdditionalPropertiesSchema: {
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        value: { type: 'string' },
      },
    },
  },
};

describe('createProcessSchema', () => {
  let processSchema;
  let mockComponents;
  let mockNameGenerator;
  let mockStats;
  let mockLog;

  beforeEach(() => {
    mockComponents = {};
    mockNameGenerator = jest.fn((context, compType, idx) => {
      return `Mock${compType}${idx}`;
    });
    mockStats = {
      schemasExtracted: 0,
      oneOfCount: 0,
      anyOfCount: 0,
      allOfCount: 0,
      maxDepth: 0,
    };
    mockLog = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  describe('schema processor creator', () => {
    it('should return a function', () => {
      processSchema = createProcessSchema(mockComponents, mockNameGenerator, mockStats, mockLog);
      expect(typeof processSchema).toBe('function');
    });

    it('should throw on missing parameters', () => {
      expect(() => createProcessSchema()).toThrow();
    });
  });

  describe('oneOf composition handling', () => {
    beforeEach(() => {
      processSchema = createProcessSchema(mockComponents, mockNameGenerator, mockStats, mockLog);
    });

    it('should extract oneOf items into components', () => {
      const schema = { ...testObjects.oneOfSchema };
      const context = {
        method: 'get',
        path: 'api/test',
        operationId: 'get-test',
      };
      processSchema(schema, context);

      expect(mockStats.oneOfCount).toBe(2);
      expect(mockStats.schemasExtracted).toBe(2);
      expect(Object.keys(mockComponents).length).toBe(2);
    });

    it('should replace oneOf items with $ref', () => {
      const schema = { ...testObjects.oneOfSchema };
      const context = { operationId: 'testOp' };
      processSchema(schema, context);

      schema.oneOf.forEach((item) => {
        expect(item).toHaveProperty('$ref');
        expect(item.$ref).toContain('#/components/schemas/');
      });
    });

    it('should skip items that are already $ref', () => {
      const schema = {
        oneOf: [
          { $ref: '#/components/schemas/Existing' },
          { type: 'object', properties: { new: { type: 'string' } } },
        ],
      };
      const context = { operationId: 'test' };

      processSchema(schema, context);

      expect(schema.oneOf[0].$ref).toBe('#/components/schemas/Existing');
      expect(mockStats.schemasExtracted).toBe(1); // Only the non-ref
    });

    it('should handle nested oneOf in properties', () => {
      const schema = {
        type: 'object',
        properties: {
          nested: testObjects.oneOfSchema,
        },
      };
      const context = { operationId: 'nested-test' };
      processSchema(schema, context);

      expect(mockStats.oneOfCount).toBe(2);
      expect(mockStats.schemasExtracted).toBe(2);
      expect(Object.keys(mockComponents).length).toBe(2);
      const nestedProp = schema.properties.nested;
      nestedProp.oneOf.forEach((item) => {
        expect(item).toHaveProperty('$ref');
      });
    });
  });

  describe('anyOf composition handling', () => {
    beforeEach(() => {
      processSchema = createProcessSchema(mockComponents, mockNameGenerator, mockStats, mockLog);
    });

    it('should extract anyOf items into components', () => {
      const schema = { ...testObjects.anyOfSchema };
      const context = {
        method: 'post',
        operationId: 'post-test',
      };
      processSchema(schema, context);

      expect(schema.anyOf.length).toBe(2);
      schema.anyOf.forEach((item) => {
        expect(item).toHaveProperty('$ref');
      });
    });

    it('should replace anyOf items with $ref', () => {
      const schema = { ...testObjects.anyOfSchema };
      const context = { operationId: 'testOp' };
      processSchema(schema, context);

      schema.anyOf.forEach((item) => {
        expect(item).toHaveProperty('$ref');
        expect(item.$ref).toContain('#/components/schemas/');
      });
    });
  });

  describe('allOf composition extraction', () => {
    beforeEach(() => {
      processSchema = createProcessSchema(mockComponents, mockNameGenerator, mockStats, mockLog);
    });

    it('should extract allOf items to components', () => {
      const schema = { ...testObjects.allOfSchema };
      const context = { operationId: 'test' };

      processSchema(schema, context);

      expect(mockStats.allOfCount).toBe(2);
      expect(mockStats.schemasExtracted).toBe(2);
    });

    it('should replace allOf items with $ref', () => {
      const schema = { ...testObjects.allOfSchema };
      const context = { operationId: 'test' };

      processSchema(schema, context);

      schema.allOf.forEach((item) => {
        expect(item).toHaveProperty('$ref');
        expect(item.$ref).toContain('#/components/schemas/');
      });
    });
  });

  describe('property traversal', () => {
    beforeEach(() => {
      processSchema = createProcessSchema(mockComponents, mockNameGenerator, mockStats, mockLog);
    });

    it('should recurse into properties', () => {
      const schema = {
        type: 'object',
        properties: {
          nested: {
            oneOf: [{ type: 'string' }, { type: 'number' }],
          },
        },
      };
      const context = { operationId: 'test', path: '/api/test' };

      processSchema(schema, context);

      expect(mockStats.schemasExtracted).toBe(2);
      schema.properties.nested.oneOf.forEach((item) => {
        expect(item).toHaveProperty('$ref');
        expect(item.$ref).toContain('#/components/schemas/');
      });
      expect(schema.properties.nested.oneOf[0].$ref).toBeDefined();
    });
  });

  it('should track propertyPath in context', () => {
    processSchema = createProcessSchema(mockComponents, mockNameGenerator, mockStats, mockLog);
    const schema = { ...testObjects.nestedProperties };
    const context = { operationId: 'test' };
    const calls = mockNameGenerator.mock.calls;
    processSchema(schema, context);
    // Check that nameGenerator was called with updated propertyPath
    // Should have been called for nested properties if they had compositions

    // expect(calls.length).toBe(2); // two properties in nested object
    calls.forEach((call) => {
      const calledContext = call[0];
      expect(calledContext).toHaveProperty('propertyPath');
      expect(calledContext.propertyPath[0]).toBe('user');
      expect(['name', 'age']).toContain(calledContext.propertyPath[1]);
    });
  });

  it('should handle deep property nesting', () => {
    processSchema = createProcessSchema(mockComponents, mockNameGenerator, mockStats, mockLog);
    const schema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                level3: {
                  oneOf: [{ type: 'string' }],
                },
              },
            },
          },
        },
      },
    };
    const context = { operationId: 'test' };

    processSchema(schema, context);

    expect(mockStats.schemasExtracted).toBe(1);
  });

  // should convert all schemas and objects to components
  // every ref must match the component name
  // no components should contain schemas or objects directly, these must all be refs to other components
  // every component is added to the components object in the yaml
});
