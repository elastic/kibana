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
      set(
        expectedDoc,
        'paths["/api/test"].post.responses["201"].content["application/json"].schema',
        {
          $ref: '#/components/schemas/ApiTest_Post_Response_201',
        }
      );
      set(expectedDoc, 'components.schemas.ApiTest_Post_Response_201', {
        type: 'object',
      });

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      expect(result).toEqual(expectedDoc);
    });
    // it.todo('should handle nested anyOf in properties', async () => {
    //   // Similar to the oneOf nested test, but for anyOf
    // });
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
    // it.todo('should handle nested allOf in properties', async () => {
    //   // Similar to the oneOf nested test, but for allOf
    // });
  });

  describe('top-level schema extraction', () => {
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
        additionalProperties: false,
        properties: {
          config: {
            $ref: '#/components/schemas/ApiActionsConnector_Get_Response_200_Config',
          },
          connector_type_id: {
            type: 'string',
            description: 'The connector type identifier.',
          },
          id: {
            type: 'string',
            description: 'The connector ID.',
          },
        },
      });
      set(expectedDoc, 'components.schemas.ApiActionsConnector_Get_Response_200_Config', {
        type: 'object',
        additionalProperties: {},
        default: {},
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
        properties: {
          settings: { $ref: '#/components/schemas/ApiCases_Post_Request_Settings' },
          title: { type: 'string' },
        },
      });
      set(expectedDoc, 'components.schemas.ApiCases_Post_Request_Settings', {
        type: 'object',
        properties: { syncAlerts: { type: 'boolean' } },
      });
      set(
        expectedDoc,
        'paths["/api/cases"].post.responses["201"].content["application/json"].schema',
        {
          $ref: '#/components/schemas/ApiCases_Post_Response_201',
        }
      );
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

    it('should handle schemas without properties gracefully', async () => {
      const testDoc = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/empty': {
            get: {
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
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
      const expectedDoc = testDoc; // Expect doc to remain completely unchanged.
      set(
        expectedDoc,
        'paths["/api/empty"].get.responses["200"].content["application/json"].schema',
        {
          $ref: '#/components/schemas/ApiEmpty_Get_Response_200',
        }
      );
      set(expectedDoc, 'components.schemas.ApiEmpty_Get_Response_200', {
        type: 'object',
      });
      await componentizeObjectSchemas(testFile, { log: mockLog });
      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));
      expect(result).toEqual(expectedDoc);
    });
  });

  describe('schemas with empty object properties', () => {
    it('should extract empty object properties to components', async () => {
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
                        type: 'object',
                        properties: {
                          emptyObj: { type: 'object', properties: {} },
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
          emptyObj: {
            $ref: '#/components/schemas/ApiTest_Get_Response_200_EmptyObj',
          },
        },
      });
      set(expectedDoc, 'components.schemas.ApiTest_Get_Response_200_EmptyObj', {
        type: 'object',
        properties: {},
      });

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      expect(result).toEqual(expectedDoc);
    });
  });

  describe('existing components with predefined names', () => {
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

      const expectedDoc = testDoc;
      set(
        expectedDoc,
        'paths["/api/test"].get.responses["200"].content["application/json"].schema',
        {
          $ref: '#/components/schemas/PredefinedSchema',
        }
      );
      set(expectedDoc, 'components.schemas.PredefinedSchema', {
        type: 'object',
        properties: {
          id: { type: 'string' },
          config: { $ref: '#/components/schemas/PredefinedSchema_Config' },
        },
      });
      set(expectedDoc, 'components.schemas.PredefinedSchema.properties.config', {
        $ref: '#/components/schemas/PredefinedSchema_Config',
      });
      set(expectedDoc, 'components.schemas.PredefinedSchema_Config', {
        type: 'object',
        properties: {
          url: { type: 'string' },
          apiKey: { type: 'string' },
        },
      });
      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

      expect(result).toEqual(expectedDoc);
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

      const expectedDoc = testDoc;
      set(
        expectedDoc,
        'paths["/api/test"].get.responses["200"].content["application/json"].schema',
        {
          $ref: '#/components/schemas/PredefinedUnion',
        }
      );
      set(expectedDoc, 'components.schemas.PredefinedUnion', {
        oneOf: [
          { $ref: '#/components/schemas/PredefinedUnion_1' },
          { $ref: '#/components/schemas/PredefinedUnion_2' },
        ],
      });
      set(expectedDoc, 'components.schemas.PredefinedUnion_1', {
        type: 'object',
        properties: { a: { type: 'string' } },
      });
      set(expectedDoc, 'components.schemas.PredefinedUnion_2', {
        type: 'object',
        properties: { b: { type: 'number' } },
      });

      await componentizeObjectSchemas(testFile, { log: mockLog });

      const result = yaml.load(fs.readFileSync(testFile, 'utf8'));
      expect(result).toEqual(expectedDoc);
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

      const expectedDoc = testDoc;
      set(
        expectedDoc,
        'paths["/api/test"].get.responses["200"].content["application/json"].schema',
        {
          $ref: '#/components/schemas/ExtendedSchema', // overwrites the base schemas
        }
      );
      set(expectedDoc, 'components.schemas.ExtendedSchema', {
        allOf: [
          { $ref: '#/components/schemas/BaseSchema' },
          { $ref: '#/components/schemas/ExtendedSchema_2' },
        ],
      });
      set(expectedDoc, 'components.schemas.ExtendedSchema_2', {
        type: 'object',
        properties: {
          name: { type: 'string' },
          metadata: { $ref: '#/components/schemas/ExtendedSchema_Metadata' },
        },
      });
      set(expectedDoc, 'components.schemas.ExtendedSchema_Metadata', {
        type: 'object',
        properties: {
          created: { type: 'string' },
        },
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
});
