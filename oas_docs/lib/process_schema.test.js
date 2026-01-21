/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// should convert all schemas and objects to components
// every ref must match the component name
// no components should contain schemas or objects directly, these must all be refs to other components
// every component is added to the components object in the yaml

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
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: {
              oneOf: [{ type: 'string' }, { type: 'number' }],
            },
            age: {
              oneOf: [{ type: 'integer' }, { type: 'null' }],
            },
          },
        },
      },
    };
    const context = { operationId: 'test' };
    const calls = mockNameGenerator.mock.calls;
    processSchema(schema, context);
    // Check that nameGenerator was called with updated propertyPath
    // Should have been called for compositions nested in properties

    // Now extracts: user object (1) + name oneOf items (2) + age oneOf items (2) = 5
    expect(calls.length).toBe(5);
    calls.forEach((call) => {
      const calledContext = call[0];
      expect(calledContext).toHaveProperty('propertyPath');
      expect(calledContext.propertyPath[0]).toBe('user');
      // First call is for 'user' object itself (property extraction)
      // Remaining calls are for 'name' and 'age' oneOf items
      if (calledContext.propertyPath.length > 1) {
        expect(['name', 'age']).toContain(calledContext.propertyPath[1]);
      }
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

    // level1 object (1) + level2 object (1) + level3 oneOf item (1) = 3
    expect(mockStats.schemasExtracted).toBe(3);
  });

  it('should extract property objects as components', () => {
    processSchema = createProcessSchema(mockComponents, mockNameGenerator, mockStats, mockLog);
    const schema = {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          properties: {
            setting: { type: 'string' },
          },
        },
        name: { type: 'string' },
      },
    };
    const context = { operationId: 'test', responseCode: '200' };
    processSchema(schema, context);
    expect(mockStats.schemasExtracted).toBe(1); // config object
    expect(Object.keys(mockComponents).length).toBe(1);
    expect(schema.properties.config).toHaveProperty('$ref');
    expect(schema.properties.name).not.toHaveProperty('$ref'); // primitive stays inline
  });

  it('should extract array item objects as components', () => {
    processSchema = createProcessSchema(mockComponents, mockNameGenerator, mockStats, mockLog);
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          value: { type: 'number' },
        },
      },
    };
    const context = { operationId: 'test', responseCode: '200' };
    processSchema(schema, context);
    expect(mockStats.schemasExtracted).toBe(1); // items object
    expect(Object.keys(mockComponents).length).toBe(1);
    expect(schema.items).toHaveProperty('$ref');
  });

  it('should extract additionalProperties objects as components', () => {
    processSchema = createProcessSchema(mockComponents, mockNameGenerator, mockStats, mockLog);
    const schema = {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          metadata: { type: 'object' },
        },
      },
    };
    const context = { operationId: 'test', responseCode: '200' };
    processSchema(schema, context);
    expect(mockStats.schemasExtracted).toBe(1); // additionalProperties object
    expect(Object.keys(mockComponents).length).toBe(1);
    expect(schema.additionalProperties).toHaveProperty('$ref');
  });

  it('should skip empty objects (no properties)', () => {
    processSchema = createProcessSchema(mockComponents, mockNameGenerator, mockStats, mockLog);
    const schema = {
      type: 'object',
      properties: {
        emptyConfig: {
          type: 'object',
          // No properties
        },
        validConfig: {
          type: 'object',
          properties: {
            setting: { type: 'string' },
          },
        },
      },
    };
    const context = { operationId: 'test', responseCode: '200' };
    processSchema(schema, context);
    expect(mockStats.schemasExtracted).toBe(1); // Only validConfig extracted
    expect(schema.properties.emptyConfig).not.toHaveProperty('$ref'); // Empty object stays inline
    expect(schema.properties.validConfig).toHaveProperty('$ref'); // Valid object extracted
  });

  it('should not extract top-level request/response objects (depth 0)', () => {
    processSchema = createProcessSchema(mockComponents, mockNameGenerator, mockStats, mockLog);
    const schema = {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            nested: { type: 'string' },
          },
        },
      },
    };
    const context = { operationId: 'test', responseCode: '200' };
    processSchema(schema, context); // Called at depth 0
    expect(mockStats.schemasExtracted).toBe(1); // Only data property object (depth 1)
    // Root object itself should NOT be extracted
    expect(schema.type).toBe('object'); // Root stays as inline object
    expect(schema.properties.data).toHaveProperty('$ref'); // Nested object extracted
  });
});
