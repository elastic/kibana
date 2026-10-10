/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyOverlay, loadContractOperations } from '@kbn/connector-contract-mock';
import { projectSpec } from './project_spec';

const ok = (schema: unknown) => ({
  description: 'ok',
  content: { 'application/json': { schema, example: {} } },
});

const document = {
  openapi: '3.0.3',
  info: { title: 'Pets', version: '2026-10-07.1', description: 'The pet API' },
  tags: [{ name: 'pets' }],
  'x-generator': 'speakeasy',
  servers: [{ url: 'https://api.example.com', description: 'Production' }],
  security: [{ 'x-key': [] }],
  paths: {
    '/pets': {
      summary: 'Pets',
      parameters: [{ $ref: '#/components/parameters/Limit' }],
      get: {
        operationId: 'listPets',
        tags: ['pets'],
        'x-codeSamples': [{ lang: 'curl', source: 'curl /pets' }],
        'x-speakeasy-pagination': { type: 'cursor', outputs: { description: 'kept' } },
        responses: { '200': ok({ type: 'array', items: { $ref: '#/components/schemas/Pet' } }) },
      },
      post: { responses: { '201': ok({ $ref: '#/components/schemas/Unused' }) } },
    },
    '/pets/{id}': {
      get: {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': ok({ $ref: '#/components/schemas/Pet/properties/owner' }),
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/stores': { get: { responses: { '200': ok({ type: 'object' }) } } },
  },
  components: {
    parameters: {
      Limit: { name: 'limit', in: 'query', description: 'Page size', schema: { type: 'integer' } },
    },
    schemas: {
      Pet: {
        type: 'object',
        description: 'A pet',
        example: { name: 'Rex' },
        properties: {
          description: { type: 'string', description: 'Free text' },
          'x-rating': { type: 'integer' },
          kind: { enum: [{ description: 'kept' }], default: { description: 'kept' } },
          owner: { $ref: '#/components/schemas/Owner' },
        },
      },
      Owner: {
        type: 'object',
        properties: { pets: { items: { $ref: '#/components/schemas/Pet' } } },
      },
      Unused: { type: 'object' },
      Error: { type: 'object', properties: { message: { type: 'string' } } },
    },
    responses: { NotFound: ok({ $ref: '#/components/schemas/Error' }) },
    securitySchemes: {
      'x-key': { type: 'apiKey', in: 'header', name: 'x-key', description: 'API key' },
      oauth: { type: 'oauth2', flows: {} },
    },
  },
};

const operations = [
  { method: 'get', path: '/pets' },
  { method: 'get', path: '/pets/{id}' },
];

const okProjected = (schema: unknown) => ({ content: { 'application/json': { schema } } });

describe('projectSpec', () => {
  it('keeps the operations, what they reference, and nothing else', () => {
    expect(projectSpec(document, operations)).toEqual({
      openapi: '3.0.3',
      info: { title: 'Pets' },
      servers: [{ url: 'https://api.example.com' }],
      security: [{ 'x-key': [] }],
      paths: {
        '/pets': {
          parameters: [{ $ref: '#/components/parameters/Limit' }],
          get: {
            operationId: 'listPets',
            'x-speakeasy-pagination': { type: 'cursor', outputs: { description: 'kept' } },
            responses: {
              '200': okProjected({ type: 'array', items: { $ref: '#/components/schemas/Pet' } }),
            },
          },
        },
        '/pets/{id}': {
          get: {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              '200': okProjected({ $ref: '#/components/schemas/Pet/properties/owner' }),
              '404': { $ref: '#/components/responses/NotFound' },
            },
          },
        },
      },
      components: {
        parameters: { Limit: { name: 'limit', in: 'query', schema: { type: 'integer' } } },
        schemas: {
          Pet: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              'x-rating': { type: 'integer' },
              kind: { enum: [{ description: 'kept' }], default: { description: 'kept' } },
              owner: { $ref: '#/components/schemas/Owner' },
            },
          },
          Owner: {
            type: 'object',
            properties: { pets: { items: { $ref: '#/components/schemas/Pet' } } },
          },
          Error: { type: 'object', properties: { message: { type: 'string' } } },
        },
        responses: { NotFound: okProjected({ $ref: '#/components/schemas/Error' }) },
        securitySchemes: { 'x-key': { type: 'apiKey', in: 'header', name: 'x-key' } },
      },
    });
  });

  it('is idempotent', () => {
    const projected = projectSpec(document, operations);

    expect(projectSpec(projected, operations)).toEqual(projected);
  });

  it('produces a document the mock loads, with every ref resolving', () => {
    expect(loadContractOperations(projectSpec(document, operations))).toHaveLength(2);
  });

  it('keeps overlays applicable, reporting corrections of operations left out as no-match', () => {
    const { document: corrected, findings } = applyOverlay(projectSpec(document, operations), {
      overlay: '1.1.0',
      info: { title: 'Corrections', version: '1' },
      actions: [
        { target: "$.components.schemas.Pet.properties['x-rating']", update: { minimum: 1 } },
        { target: "$.paths['/stores'].get", update: { security: [] } },
      ],
    });

    expect(corrected).toHaveProperty(['components', 'schemas', 'Pet', 'properties', 'x-rating'], {
      type: 'integer',
      minimum: 1,
    });
    expect(findings).toEqual([expect.objectContaining({ index: 1, problem: 'no-match' })]);
  });

  it('converts Swagger 2.0 documents first', () => {
    const swagger = {
      swagger: '2.0',
      info: { title: 'Legacy', version: '1' },
      host: 'api.example.com',
      schemes: ['https'],
      paths: {
        '/things': {
          get: {
            responses: { '200': { description: 'ok', schema: { $ref: '#/definitions/Thing' } } },
          },
        },
      },
      definitions: { Thing: { type: 'object' }, Other: { type: 'object' } },
    };

    const projected = projectSpec(swagger, [{ method: 'get', path: '/things' }]);

    expect(projected).toMatchObject({
      openapi: expect.stringMatching(/^3\./),
      servers: [{ url: 'https://api.example.com' }],
      components: { schemas: { Thing: { type: 'object' } } },
    });
    expect(projected.components).not.toHaveProperty('schemas.Other');
  });
});
