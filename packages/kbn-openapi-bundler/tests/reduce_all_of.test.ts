/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from './create_oas_document';

describe('OpenAPI Bundler - reduce allOf item', () => {
  it('flatten folded allOfs', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      allOf: [
                        {
                          allOf: [
                            {
                              allOf: [
                                { $ref: '#/components/schemas/SchemaA' },
                                {
                                  type: 'object',
                                  properties: {
                                    fieldA: { type: 'string' },
                                  },
                                  required: ['fieldA'],
                                },
                              ],
                            },
                          ],
                        },
                        { $ref: '#/components/schemas/SchemaB' },
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
          SchemaA: {
            type: 'object',
            properties: {
              fieldX: { type: 'string' },
            },
          },
          SchemaB: {
            type: 'object',
            properties: {
              fieldX: { type: 'string' },
            },
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec,
      })
    );

    expect(bundledSpec.paths['/api/some_api']!.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            allOf: [
              { $ref: '#/components/schemas/SchemaA' },
              {
                type: 'object',
                properties: {
                  fieldA: { type: 'string' },
                },
                required: ['fieldA'],
              },
              { $ref: '#/components/schemas/SchemaB' },
            ],
          },
        },
      },
    });
  });

  it('unfolds single allOf item', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      allOf: [
                        {
                          type: 'string',
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec,
      })
    );

    expect(bundledSpec.paths['/api/some_api']!.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: { type: 'string' },
        },
      },
    });
  });

  it('merges non conflicting allOf object schema items', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      allOf: [
                        { $ref: '#/components/schemas/SchemaA' },
                        {
                          type: 'object',
                          properties: {
                            fieldA: {
                              type: 'string',
                            },
                          },
                        },
                        { $ref: '#/components/schemas/SchemaB' },
                        {
                          type: 'object',
                          properties: {
                            fieldB: {
                              type: 'string',
                            },
                          },
                          required: ['fieldB'],
                        },
                        { $ref: '#/components/schemas/SchemaC' },
                        {
                          type: 'object',
                          properties: {
                            fieldC: {
                              type: 'string',
                            },
                          },
                          required: ['fieldC'],
                        },
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
          SchemaA: {
            type: 'object',
            properties: {
              fieldX: { type: 'string' },
            },
          },
          SchemaB: {
            type: 'object',
            properties: {
              fieldY: { type: 'string' },
            },
          },
          SchemaC: {
            type: 'object',
            properties: {
              fieldZ: { type: 'string' },
            },
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec,
      })
    );

    expect(bundledSpec.paths['/api/some_api']!.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            allOf: [
              {
                type: 'object',
                properties: {
                  fieldA: {
                    type: 'string',
                  },
                  fieldB: {
                    type: 'string',
                  },
                  fieldC: {
                    type: 'string',
                  },
                },
                required: ['fieldB', 'fieldC'],
              },
              { $ref: '#/components/schemas/SchemaA' },
              { $ref: '#/components/schemas/SchemaB' },
              { $ref: '#/components/schemas/SchemaC' },
            ],
          },
        },
      },
    });
  });

  it('DOES NOT merge conflicting incompatible allOf object schema items', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      allOf: [
                        {
                          type: 'object',
                          properties: {
                            fieldA: {
                              type: 'string',
                            },
                          },
                        },
                        {
                          type: 'object',
                          properties: {
                            fieldB: {
                              type: 'string',
                            },
                          },
                          required: ['fieldB'],
                        },
                        {
                          type: 'object',
                          properties: {
                            fieldA: {
                              type: 'boolean',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec,
      })
    );

    expect(bundledSpec.paths['/api/some_api']!.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            allOf: [
              {
                type: 'object',
                properties: {
                  fieldA: {
                    type: 'string',
                  },
                },
              },
              {
                type: 'object',
                properties: {
                  fieldB: {
                    type: 'string',
                  },
                },
                required: ['fieldB'],
              },
              {
                type: 'object',
                properties: {
                  fieldA: {
                    type: 'boolean',
                  },
                },
              },
            ],
          },
        },
      },
    });
  });

  it('merges allOf object schema items with inlined references', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      allOf: [
                        {
                          type: 'string',
                          enum: ['value1'],
                        },
                        {
                          type: 'object',
                          properties: {
                            fieldA: {
                              type: 'string',
                            },
                          },
                        },
                        {
                          $ref: '#/components/schemas/SchemaA',
                        },
                        {
                          type: 'object',
                          properties: {
                            fieldB: {
                              type: 'string',
                            },
                          },
                          required: ['fieldB'],
                        },
                        {
                          $ref: '#/components/schemas/SchemaAToInline',
                        },
                        {
                          $ref: '#/components/schemas/SchemaB',
                        },
                        {
                          type: 'object',
                          properties: {
                            stringField: {
                              type: 'string',
                            },
                          },
                          required: ['stringField'],
                        },
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
          SchemaAToInline: {
            // @ts-expect-error OpenAPIV3.Document doesn't allow to add custom props to components.schemas
            'x-inline': true,
            allOf: [
              {
                type: 'string',
                enum: ['SchemaAToInline-value1'],
              },
              {
                type: 'object',
                properties: {
                  enumField: {
                    type: 'string',
                    enum: ['SchemaAToInline-value2'],
                  },
                  integerField: {
                    type: 'integer',
                    minimum: 1,
                  },
                },
              },
              {
                $ref: './common.schema.yaml#/components/schemas/SchemaBToInline',
              },
            ],
          },
          SchemaA: {
            type: 'object',
            properties: {
              fieldX: { type: 'string' },
            },
          },
          SchemaB: {
            type: 'object',
            properties: {
              fieldY: { type: 'string' },
            },
          },
        },
      },
    });
    const commonSpec = createOASDocument({
      components: {
        schemas: {
          SchemaBToInline: {
            // @ts-expect-error OpenAPIV3.Document doesn't allow to add custom props to components.schemas
            'x-inline': true,
            allOf: [
              {
                type: 'string',
                enum: ['SchemaBToInline-value1', 'SchemaBToInline-value2'],
              },
              {
                type: 'object',
                properties: {
                  fieldD: {
                    type: 'string',
                  },
                  fieldE: {
                    type: 'string',
                  },
                },
                required: ['fieldE'],
              },
            ],
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec,
        common: commonSpec,
      })
    );

    expect(bundledSpec.paths['/api/some_api']!.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            allOf: [
              {
                type: 'object',
                properties: {
                  fieldA: {
                    type: 'string',
                  },
                  fieldB: {
                    type: 'string',
                  },
                  enumField: {
                    type: 'string',
                    enum: ['SchemaAToInline-value2'],
                  },
                  integerField: {
                    type: 'integer',
                    minimum: 1,
                  },
                  fieldD: {
                    type: 'string',
                  },
                  fieldE: {
                    type: 'string',
                  },
                  stringField: {
                    type: 'string',
                  },
                },
                required: ['fieldB', 'fieldE', 'stringField'],
              },
              {
                type: 'string',
                enum: ['value1'],
              },
              {
                $ref: '#/components/schemas/SchemaA',
              },
              {
                type: 'string',
                enum: ['SchemaAToInline-value1'],
              },
              {
                type: 'string',
                enum: ['SchemaBToInline-value1', 'SchemaBToInline-value2'],
              },
              {
                $ref: '#/components/schemas/SchemaB',
              },
            ],
          },
        },
      },
    });
  });

  it('merges allOf object schema items inlined in different document branches with extra field', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        responseSchemaFieldA: {
                          $ref: '#/components/schemas/SchemaToInline',
                        },
                        responseSchemaFieldB: {
                          $ref: '#/components/schemas/MySchema',
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
      components: {
        schemas: {
          MySchema: {
            allOf: [
              {
                $ref: '#/components/schemas/SchemaToInline',
              },
              {
                type: 'object',
                properties: {
                  mySchemaSubfield: {
                    type: 'boolean',
                  },
                },
              },
            ],
          },
          SchemaToInline: {
            // @ts-expect-error OpenAPIV3.Document doesn't allow to add custom props to components.schemas
            'x-inline': true,
            allOf: [
              {
                type: 'object',
                properties: {
                  SchemaToInlineField1: {
                    type: 'string',
                  },
                },
              },
              {
                type: 'object',
                properties: {
                  SchemaToInlineField2: {
                    type: 'number',
                  },
                },
                required: ['field2'],
              },
            ],
          },
        },
      },
    });
    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec,
      })
    );

    expect(bundledSpec.paths['/api/some_api']!.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              responseSchemaFieldA: {
                type: 'object',
                properties: {
                  SchemaToInlineField1: {
                    type: 'string',
                  },
                  SchemaToInlineField2: {
                    type: 'number',
                  },
                },
                required: ['field2'],
              },
              responseSchemaFieldB: {
                $ref: '#/components/schemas/MySchema',
              },
            },
          },
        },
      },
    });
  });
});
