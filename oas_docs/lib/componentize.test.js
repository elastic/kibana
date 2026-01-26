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
const { set } = require('@kbn/safer-lodash-set');
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

      const expectedDoc = testDoc;

      set(
        expectedDoc,
        'paths["/api/test"].get.responses["200"].content["application/json"].schema',
        {
          $ref: '#/components/schemas/ApiTest_Get_Response_200',
        }
      );
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200', {
        oneOf: [
          { $ref: '#/components/schemas/ApiTest_Get_Response_200_1' },
          { $ref: '#/components/schemas/ApiTest_Get_Response_200_2' },
        ],
      });
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200_1', {
        type: 'object',
        properties: { a: { type: 'string' } },
      });
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200_2', {
        type: 'object',
        properties: { b: { type: 'number' } },
      });

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      expect(result).toEqual(expectedDoc);
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

      const expectedDoc = testDoc;

      set(
        expectedDoc,
        'paths["/api/test"].get.responses["200"].content["application/json"].schema',
        {
          $ref: '#/components/schemas/ApiTest_Get_Response_200',
        }
      );
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200', {
        type: 'object',
        properties: {
          thing: {
            oneOf: [
              { $ref: '#/components/schemas/ApiTest_Get_Response_200_Thing_1' },
              { $ref: '#/components/schemas/ApiTest_Get_Response_200_Thing_2' },
            ],
          },
        },
      });
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200_Thing_1', {
        type: 'string',
      });
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200_Thing_2', {
        type: 'number',
      });

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      expect(result).toEqual(expectedDoc);
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

      const expectedDoc = testDoc;

      set(expectedDoc, 'paths["/api/test"].post.requestBody.content["application/json"].schema', {
        $ref: '#/components/schemas/ApiTest_Post_Request',
      });
      set(expectedDoc, 'components.schemas.ApiTest_Post_Request', {
        anyOf: [
          { $ref: '#/components/schemas/ApiTest_Post_Request_1' },
          { $ref: '#/components/schemas/ApiTest_Post_Request_2' },
        ],
      });
      set(expectedDoc, 'components.schemas.ApiTest_Post_Request_1', {
        type: 'object',
        properties: { x: { type: 'string' } },
      });
      set(expectedDoc, 'components.schemas.ApiTest_Post_Request_2', {
        type: 'object',
        properties: { y: { type: 'number' } },
      });

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      expect(result).toEqual(expectedDoc);
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

      const expectedDoc = testDoc;

      set(
        expectedDoc,
        'paths["/api/test"].get.responses["200"].content["application/json"].schema',
        {
          $ref: '#/components/schemas/ApiTest_Get_Response_200',
        }
      );
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200', {
        allOf: [
          { $ref: '#/components/schemas/ApiTest_Get_Response_200_1' },
          { $ref: '#/components/schemas/ApiTest_Get_Response_200_2' },
        ],
      });
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200_1', {
        type: 'object',
        properties: { base: { type: 'string' } },
      });
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200_2', {
        type: 'object',
        properties: { extended: { type: 'number' } },
      });

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      expect(result).toEqual(expectedDoc);
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

      const expectedDoc = testDoc;

      set(
        expectedDoc,
        'paths["/api/test"].get.responses["200"].content["application/json"].schema',
        {
          $ref: '#/components/schemas/ApiTest_Get_Response_200',
        }
      );
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200', {
        oneOf: [
          { $ref: '#/components/schemas/ExistingSchema' },
          { $ref: '#/components/schemas/ApiTest_Get_Response_200_2' },
        ],
      });
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200_2', {
        type: 'object',
        properties: { new: { type: 'string' } },
      });

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      expect(result).toEqual(expectedDoc);
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

      const expectedDoc = testDoc;
      set(
        expectedDoc,
        'paths["/api/test"].get.responses["200"].content["application/json"].schema',
        {
          $ref: '#/components/schemas/ApiTest_Get_Response_200',
        }
      );
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200', {
        oneOf: [],
      });

      // Should not throw
      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      expect(result).toEqual(testDoc);
    });

    it('should prevent infinite recursion on deep nesting', async () => {
      // Create a very deeply nested structure
      // Note: With object extraction, nested objects get converted to $refs which stops recursion
      // So we need to use a structure that doesn't trigger object extraction (e.g., composition types)
      // MAX_RECURSION_DEPTH is 100, so create 105 levels to trigger the warning
      let deepSchema = { type: 'string' };
      for (let i = 0; i < 105; i++) {
        deepSchema = {
          oneOf: [deepSchema, { type: 'number' }],
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

      // Should have 1 top-level component + 2 oneOf items = 3 components
      const componentNames = Object.keys(result.components.schemas);
      expect(componentNames.length).toBe(3);

      // Top-level component name
      expect(result.components.schemas).toHaveProperty('ApiActionsConnector_Get_Response_200');

      // OneOf item names should include index
      expect(result.components.schemas).toHaveProperty('ApiActionsConnector_Get_Response_200_1');
      expect(result.components.schemas).toHaveProperty('ApiActionsConnector_Get_Response_200_2');

      // Verify structure
      expect(result.components.schemas.ApiActionsConnector_Get_Response_200).toEqual({
        oneOf: [
          { $ref: '#/components/schemas/ApiActionsConnector_Get_Response_200_1' },
          { $ref: '#/components/schemas/ApiActionsConnector_Get_Response_200_2' },
        ],
      });
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

      // Should have: 2 top-level (GET/POST responses) + 2 oneOf items = 4 components
      const componentNames = Object.keys(result.components.schemas);
      expect(componentNames.length).toBe(4);
      expect(new Set(componentNames).size).toBe(4); // All unique

      // Verify all components have unique names
      expect(result.components.schemas).toHaveProperty('ApiTest_Get_Response_200');
      expect(result.components.schemas).toHaveProperty('ApiTest_Get_Response_200_1');
      expect(result.components.schemas).toHaveProperty('ApiTest_Post_Response_200');
      expect(result.components.schemas).toHaveProperty('ApiTest_Post_Response_200_1');
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

      const expectedDoc = testDoc;
      set(
        expectedDoc,
        'paths["/api/actions/connector/{id}"].get.responses["200"].content["application/json"].schema',
        {
          $ref: '#/components/schemas/ApiActionsConnector_Get_Response_200',
        }
      );
      set(expectedDoc, 'components.schemas.ApiActionsConnector_Get_Response_200', {
        type: 'object',
        properties: {
          config: { $ref: '#/components/schemas/ApiActionsConnector_Get_Response_200_Config' },
        },
      });
      set(expectedDoc, 'components.schemas.ApiActionsConnector_Get_Response_200_Config', {
        type: 'object',
        properties: {
          from: { type: 'string' },
          host: { type: 'string' },
        },
      });

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      expect(result).toEqual(expectedDoc);
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

      const expectedDoc = testDoc;
      set(expectedDoc, 'paths["/api/cases"].post.requestBody.content["application/json"].schema', {
        $ref: '#/components/schemas/ApiCases_Post_Request',
      });
      set(expectedDoc, 'components.schemas.ApiCases_Post_Request', {
        type: 'object',
        required: ['title'],
        properties: { settings: { $ref: '#/components/schemas/ApiCases_Post_Request_Settings' } },
      });
      set(expectedDoc, 'components.schemas.ApiCases_Post_Request_Settings', {
        type: 'object',
        properties: { syncAlerts: { type: 'boolean' } },
      });
      set(expectedDoc, 'components.schemas.ApiCases_Post_Response_201', {
        type: 'object',
      });

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      expect(result).toEqual(expectedDoc);
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

      const expectedDoc = testDoc; // Expect doc to remain completely unchanged.

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      expect(result).toEqual(expectedDoc);
    });
  });

  // TODO: refactor these tests in the style above
  describe.skip('existing components with predefined names (Phase 3)', () => {
    it('should process existing component with nested object properties', async () => {
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
                        $ref: '#/components/schemas/PredefinedSchema',
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
            PredefinedSchema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                config: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    apiKey: { type: 'string' },
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

      // PredefinedSchema should still exist with same name
      expect(result.components.schemas.PredefinedSchema).toBeDefined();

      // config property should now be a reference
      expect(result.components.schemas.PredefinedSchema.properties.config).toEqual({
        $ref: '#/components/schemas/PredefinedSchema_Config',
      });

      // Extracted config component should exist with parent name as prefix
      expect(result.components.schemas.PredefinedSchema_Config).toEqual({
        type: 'object',
        properties: {
          url: { type: 'string' },
          apiKey: { type: 'string' },
        },
      });

      // Simple property should remain inline
      expect(result.components.schemas.PredefinedSchema.properties.id).toEqual({ type: 'string' });
    });

    it('should process existing component with composition types', async () => {
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
                        $ref: '#/components/schemas/PredefinedUnion',
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
            PredefinedUnion: {
              oneOf: [
                { type: 'object', properties: { a: { type: 'string' } } },
                { type: 'object', properties: { b: { type: 'number' } } },
              ],
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      // PredefinedUnion should still exist with same name
      expect(result.components.schemas.PredefinedUnion).toBeDefined();

      // oneOf items should be extracted with parent name as prefix
      expect(result.components.schemas.PredefinedUnion.oneOf).toEqual([
        { $ref: '#/components/schemas/PredefinedUnion_1' },
        { $ref: '#/components/schemas/PredefinedUnion_2' },
      ]);

      // Extracted oneOf items should exist
      expect(result.components.schemas.PredefinedUnion_1).toEqual({
        type: 'object',
        properties: { a: { type: 'string' } },
      });
      expect(result.components.schemas.PredefinedUnion_2).toEqual({
        type: 'object',
        properties: { b: { type: 'number' } },
      });
    });

    it('should handle multiple existing components without name collisions', async () => {
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
                        $ref: '#/components/schemas/SchemaA',
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
            SchemaA: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  properties: {
                    urlA: { type: 'string' },
                  },
                },
              },
            },
            SchemaB: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  properties: {
                    urlB: { type: 'string' },
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

      // Both schemas should exist with original names
      expect(result.components.schemas.SchemaA).toBeDefined();
      expect(result.components.schemas.SchemaB).toBeDefined();

      // Each should have extracted config with unique names (parent name prefix prevents collision)
      expect(result.components.schemas.SchemaA.properties.config).toEqual({
        $ref: '#/components/schemas/SchemaA_Config',
      });
      expect(result.components.schemas.SchemaB.properties.config).toEqual({
        $ref: '#/components/schemas/SchemaB_Config',
      });

      // Both config components should exist with different content
      expect(result.components.schemas.SchemaA_Config).toEqual({
        type: 'object',
        properties: {
          urlA: { type: 'string' },
        },
      });
      expect(result.components.schemas.SchemaB_Config).toEqual({
        type: 'object',
        properties: {
          urlB: { type: 'string' },
        },
      });

      // Verify no collision - should have 4 components total
      expect(Object.keys(result.components.schemas).length).toBe(4);
    });

    it('should handle existing component referencing another existing component', async () => {
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
                        $ref: '#/components/schemas/ExtendedSchema',
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
            BaseSchema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            },
            ExtendedSchema: {
              allOf: [
                { $ref: '#/components/schemas/BaseSchema' },
                {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    metadata: {
                      type: 'object',
                      properties: {
                        created: { type: 'string' },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      };

      const testFile = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(testFile, yaml.dump(testDoc));

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      // Both original components should exist
      expect(result.components.schemas.BaseSchema).toBeDefined();
      expect(result.components.schemas.ExtendedSchema).toBeDefined();

      // Reference to BaseSchema should be preserved
      expect(result.components.schemas.ExtendedSchema.allOf[0]).toEqual({
        $ref: '#/components/schemas/BaseSchema',
      });

      // The second allOf item (inline object) should be extracted
      expect(result.components.schemas.ExtendedSchema.allOf[1]).toEqual({
        $ref: '#/components/schemas/ExtendedSchema_2',
      });

      // Extracted allOf item should have metadata extracted
      const extractedAllOf = result.components.schemas.ExtendedSchema_2;
      expect(extractedAllOf.properties.name).toEqual({ type: 'string' });
      expect(extractedAllOf.properties.metadata).toEqual({
        $ref: '#/components/schemas/ExtendedSchema_Metadata',
      });

      // Nested metadata component should exist
      expect(result.components.schemas.ExtendedSchema_Metadata).toEqual({
        type: 'object',
        properties: {
          created: { type: 'string' },
        },
      });
    });
  });
});
