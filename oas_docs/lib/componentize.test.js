/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { componentizeObjectSchemas } = require('./componentize');

// initial test cases
// TODO: add test cases for failed extractions, naming strategy, edge cases, etc.
describe('componentizeObjectSchemas', () => {
  let tempDir;
  let mockLog;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'componentize-test-'));
    mockLog = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('oneOf composition extraction', () => {
    it('should extract oneOf items to components', async () => {
      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: {
              operationId: 'getTest',
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: {
                        oneOf: [
                          { type: 'object', properties: { a: { type: 'string' } } },
                          { type: 'object', properties: { b: { type: 'number' } } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      // Check that oneOf items are now references
      const schema =
        result.paths['/api/test'].get.responses['200'].content['application/json'].schema;
      expect(schema.oneOf).toBeDefined();
      expect(schema.oneOf[0].$ref).toBeDefined();
      expect(schema.oneOf[1].$ref).toBeDefined();

      // Check that components were created
      expect(result.components.schemas).toBeDefined();
      expect(Object.keys(result.components.schemas).length).toBe(2);
      // check the structure and placement of the components
      const componentNames = Object.keys(result.components.schemas);
      const comp1 = result.components.schemas[componentNames[0]];
      const comp2 = result.components.schemas[componentNames[1]];
      expect(comp1).toHaveProperty('type', 'object');
      expect(comp2).toHaveProperty('type', 'object');
      expect(comp1).toMatchInlineSnapshot(`
        Object {
          "properties": Object {
            "a": Object {
              "type": "string",
            },
          },
          "type": "object",
        }
      `);
    });

    it('should handle nested oneOf in properties', async () => {
      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: {
              operationId: 'getTest',
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          thing: {
                            oneOf: [{ type: 'string' }, { type: 'number' }],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      // The top-level schema should now be extracted as a component
      const responseSchema =
        result.paths['/api/test'].get.responses['200'].content['application/json'].schema;
      expect(responseSchema.$ref).toBeDefined();

      // Get the extracted component
      const componentName = responseSchema.$ref.split('/').pop();
      const extractedSchema = result.components.schemas[componentName];

      // Check nested oneOf was extracted in the component
      expect(extractedSchema.properties.thing.oneOf[0].$ref).toBeDefined();
      expect(extractedSchema.properties.thing.oneOf[1].$ref).toBeDefined();
    });
  });

  describe('anyOf composition extraction', () => {
    it('should extract anyOf items to components', async () => {
      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/test': {
            post: {
              operationId: 'postTest',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      anyOf: [
                        { type: 'object', properties: { x: { type: 'string' } } },
                        { type: 'object', properties: { y: { type: 'number' } } },
                      ],
                    },
                  },
                },
              },
              responses: {
                201: {
                  content: {
                    'application/json': {
                      schema: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      // Check anyOf extraction
      const schema = result.paths['/api/test'].post.requestBody.content['application/json'].schema;
      expect(schema.anyOf[0].$ref).toBeDefined();
      expect(schema.anyOf[1].$ref).toBeDefined();
    });
  });

  describe('allOf composition extraction', () => {
    it('should extract allOf items to components', async () => {
      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: {
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: {
                        allOf: [
                          { type: 'object', properties: { base: { type: 'string' } } },
                          { type: 'object', properties: { extended: { type: 'number' } } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      // Check allOf extraction
      const schema =
        result.paths['/api/test'].get.responses['200'].content['application/json'].schema;
      expect(schema.allOf[0].$ref).toBeDefined();
      expect(schema.allOf[1].$ref).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should skip schemas that are already references', async () => {
      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: {
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: {
                        oneOf: [
                          { $ref: '#/components/schemas/ExistingSchema' },
                          { type: 'object', properties: { new: { type: 'string' } } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            ExistingSchema: { type: 'object' },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      // Original reference should remain
      const schema =
        result.paths['/api/test'].get.responses['200'].content['application/json'].schema;
      expect(schema.oneOf[0].$ref).toBe('#/components/schemas/ExistingSchema');

      // New item should be extracted
      expect(schema.oneOf[1].$ref).toBeDefined();
      expect(schema.oneOf[1].$ref).not.toBe('#/components/schemas/ExistingSchema');
    });

    it('should handle empty composition arrays', async () => {
      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: {
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: {
                        oneOf: [],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      // Should not throw
      await expect(componentizeObjectSchemas(testFile, { log: mockLog })).resolves.not.toThrow();
    });

    it('should prevent infinite recursion on deep nesting', async () => {
      // Create a very deeply nested structure
      let deepSchema = { type: 'string' };
      for (let i = 0; i < 25; i++) {
        deepSchema = {
          type: 'object',
          properties: {
            nested: deepSchema,
          },
        };
      }

      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: {
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: deepSchema,
                    },
                  },
                },
              },
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      // Should not throw or hang
      await expect(componentizeObjectSchemas(testFile, { log: mockLog })).resolves.not.toThrow(); // we might want to throw though

      // Should warn about max depth
      expect(mockLog.warn).toHaveBeenCalledWith(expect.stringContaining('Max depth reached'));
    });
  });

  describe('naming strategy', () => {
    it('should generate unique names for compositions', async () => {
      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/actions/connector': {
            get: {
              operationId: 'getActionsConnector',
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: {
                        oneOf: [
                          { type: 'object', properties: { type: { type: 'string' } } },
                          { type: 'object', properties: { id: { type: 'number' } } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      // Check component names
      const componentNames = Object.keys(result.components.schemas);
      expect(componentNames.length).toBe(2);

      // Names should include operation ID, Response, status code, and index
      expect(componentNames[0]).toMatchInlineSnapshot(`"ApiActionsConnector_Get_Response_200_1"`);
      expect(componentNames[1]).toMatchInlineSnapshot(`"ApiActionsConnector_Get_Response_200_2"`);
    });

    it('should handle name collisions', async () => {
      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: {
              operationId: 'test',
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: {
                        oneOf: [{ type: 'object', properties: { a: { type: 'string' } } }],
                      },
                    },
                  },
                },
              },
            },
            post: {
              operationId: 'test',
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: {
                        oneOf: [{ type: 'object', properties: { b: { type: 'string' } } }],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      // Should have created unique names despite collision
      const componentNames = Object.keys(result.components.schemas);
      expect(componentNames.length).toBe(2);
      expect(new Set(componentNames).size).toBe(2); // All unique
    });
  });

  describe('top-level schema extraction (from componentization example)', () => {
    it('should extract top-level response schema and nested properties', async () => {
      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/actions/connector/{id}': {
            get: {
              operationId: 'get-actions-connector-id',
              parameters: [
                {
                  description: 'An identifier for the connector.',
                  in: 'path',
                  name: 'id',
                  required: true,
                  schema: { type: 'string' },
                },
              ],
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: {
                        additionalProperties: false,
                        type: 'object',
                        properties: {
                          config: {
                            additionalProperties: {},
                            default: {},
                            type: 'object',
                            properties: {
                              from: { type: 'string' },
                              host: { type: 'string' },
                            },
                          },
                          connector_type_id: {
                            description: 'The connector type identifier.',
                            type: 'string',
                          },
                          id: {
                            description: 'The connector ID.',
                            type: 'string',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      // Check that top-level response schema is now a reference
      const responseSchema =
        result.paths['/api/actions/connector/{id}'].get.responses['200'].content['application/json']
          .schema;
      expect(responseSchema.$ref).toBe('#/components/schemas/ApiActionsConnector_Get_Response_200');

      // Check that the component was created
      expect(result.components.schemas.ApiActionsConnector_Get_Response_200).toBeDefined();
      const topLevelComponent = result.components.schemas.ApiActionsConnector_Get_Response_200;
      expect(topLevelComponent.type).toBe('object');
      expect(topLevelComponent.properties).toBeDefined();

      // Check that nested config property is also extracted as a reference
      expect(topLevelComponent.properties.config.$ref).toBe(
        '#/components/schemas/ApiActionsConnector_Get_Response_200_Config'
      );

      // Check that the nested config component exists
      expect(result.components.schemas.ApiActionsConnector_Get_Response_200_Config).toBeDefined();
      const configComponent = result.components.schemas.ApiActionsConnector_Get_Response_200_Config;
      expect(configComponent.type).toBe('object');
      expect(configComponent.properties.from).toEqual({ type: 'string' });
      expect(configComponent.properties.host).toEqual({ type: 'string' });

      // Check that simple properties remain inline
      expect(topLevelComponent.properties.connector_type_id).toEqual({
        description: 'The connector type identifier.',
        type: 'string',
      });
      expect(topLevelComponent.properties.id).toEqual({
        description: 'The connector ID.',
        type: 'string',
      });
    });

    it('should extract top-level request schema', async () => {
      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/cases': {
            post: {
              operationId: 'create-case',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['title'],
                      properties: {
                        title: { type: 'string' },
                        settings: {
                          type: 'object',
                          properties: {
                            syncAlerts: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                201: {
                  content: {
                    'application/json': {
                      schema: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      // Check that top-level request schema is now a reference
      const requestSchema =
        result.paths['/api/cases'].post.requestBody.content['application/json'].schema;
      expect(requestSchema.$ref).toBe('#/components/schemas/ApiCases_Post_Request');

      // Check that the component was created
      expect(result.components.schemas.ApiCases_Post_Request).toBeDefined();
      const requestComponent = result.components.schemas.ApiCases_Post_Request;
      expect(requestComponent.type).toBe('object');
      expect(requestComponent.required).toEqual(['title']);

      // Check that nested settings property is also extracted
      expect(requestComponent.properties.settings.$ref).toBe(
        '#/components/schemas/ApiCases_Post_Request_Settings'
      );

      // Check that the nested settings component exists
      expect(result.components.schemas.ApiCases_Post_Request_Settings).toBeDefined();
    });

    it('should not extract schemas that are already references', async () => {
      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: {
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/ExistingSchema',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            ExistingSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      // Schema should remain a reference to ExistingSchema
      const responseSchema =
        result.paths['/api/test'].get.responses['200'].content['application/json'].schema;
      expect(responseSchema.$ref).toBe('#/components/schemas/ExistingSchema');

      // Should only have one component (the existing one)
      expect(Object.keys(result.components.schemas).length).toBe(1);
      expect(result.components.schemas.ExistingSchema).toBeDefined();
    });
  });
});
