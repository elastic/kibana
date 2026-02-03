/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { generateParameterTypes } from './generate_parameter_types';

describe('generateParameterTypes', () => {
  it('should generate parameter types from simple operation with inline parameters', () => {
    const getOperation: OpenAPIV3.OperationObject = {
      parameters: [
        {
          name: 'queryParam',
          in: 'query',
        },
        {
          name: 'pathParam',
          in: 'path',
        },
        {
          name: 'headerParam',
          in: 'header',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                bodyParam: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Success',
        },
      },
      operationId: 'test',
    };
    const openApiDocument = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '{pathParam}/test': {
          get: getOperation,
        },
      },
    };
    const parameterTypes = generateParameterTypes([getOperation], openApiDocument);
    expect(parameterTypes).toBeDefined();
    expect(parameterTypes.headerParams).toEqual(['headerParam']);
    expect(parameterTypes.pathParams).toEqual(['pathParam']);
    expect(parameterTypes.urlParams).toEqual(['queryParam']);
    expect(parameterTypes.bodyParams).toEqual(['bodyParam']);
  });
  it('should generate parameter types from operation with reference parameters', () => {
    const operationWithRefs: OpenAPIV3.OperationObject = {
      parameters: [
        {
          $ref: '#/components/parameters/queryParam',
        },
        {
          $ref: '#/components/parameters/pathParam',
        },
        {
          $ref: '#/components/parameters/headerParam',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/requestBodySchema',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Success',
        },
      },
      operationId: 'operationWithRefs',
    };
    const openApiDocument: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '{pathParam}/test': {
          get: operationWithRefs,
        },
      },
      components: {
        parameters: {
          queryParam: {
            name: 'queryParam',
            in: 'query',
          },
          pathParam: {
            name: 'pathParam',
            in: 'path',
          },
          headerParam: {
            name: 'headerParam',
            in: 'header',
          },
        },
        schemas: {
          requestBodySchema: {
            type: 'object',
            properties: {
              bodyParam: { $ref: '#/components/schemas/bodyParamSchema' },
            },
          },
          bodyParamSchema: {
            type: 'object',
            properties: {
              bodyParam: { type: 'string' },
            },
          },
        },
      },
    };
    const parameterTypes = generateParameterTypes([operationWithRefs], openApiDocument);
    expect(parameterTypes).toBeDefined();
    expect(parameterTypes.headerParams).toEqual(['headerParam']);
    expect(parameterTypes.pathParams).toEqual(['pathParam']);
    expect(parameterTypes.urlParams).toEqual(['queryParam']);
    expect(parameterTypes.bodyParams).toEqual(['bodyParam']);
  });
  it('should generate parameter types from an operation with oneOf in the request body', () => {
    const operationWithOneOf: OpenAPIV3.OperationObject = {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              oneOf: [
                {
                  $ref: '#/components/schemas/requestBodySchema1',
                },
                {
                  $ref: '#/components/schemas/requestBodySchema2',
                },
              ],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Success',
        },
      },
      operationId: 'operationWithOneOf',
    };
    const openApiDocument: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '{pathParam}/test': {
          get: operationWithOneOf,
        },
      },
      components: {
        schemas: {
          requestBodySchema1: {
            type: 'object',
            properties: {
              bodyParam1: { type: 'string' },
            },
          },
          requestBodySchema2: {
            type: 'object',
            properties: {
              bodyParam2: { type: 'string' },
            },
          },
        },
      },
    };
    const parameterTypes = generateParameterTypes([operationWithOneOf], openApiDocument);
    expect(parameterTypes).toBeDefined();
    expect(parameterTypes.bodyParams).toEqual(['bodyParam1', 'bodyParam2']);
  });
});
