/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '@kbn/connector-contract-mock';
import { describeOperation, findOperation, listOperations } from './inspect_spec';

const document: OpenApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Example', version: '1.0' },
  servers: [
    {
      url: 'https://{region}.example.com',
      variables: { region: { default: 'us', enum: ['us', 'eu'] } },
    },
  ],
  security: [{ token: [] }],
  paths: {
    '/repos/{owner}/{repo}/issues': {
      parameters: [
        { $ref: '#/components/parameters/Owner' },
        { name: 'repo', in: 'path', schema: { type: 'string' } },
      ],
      get: {
        operationId: 'listIssues',
        summary: 'List   issues\n in a repository',
        parameters: [
          { name: 'labels', in: 'query', schema: { type: 'array', items: { type: 'string' } } },
          { name: 'ids', in: 'query', style: 'form', explode: false, schema: { type: 'array' } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', maximum: 100 } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Issue' } },
                example: [{ id: 1 }],
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        operationId: 'createIssue',
        deprecated: true,
        security: [{ oauth: ['repo'] }],
        requestBody: { $ref: '#/components/requestBodies/NewIssue' },
        responses: { '201': { description: 'created' } },
      },
    },
    '/aliased': { $ref: '#/components/pathItems/Aliased' },
  },
  components: {
    parameters: {
      Owner: { name: 'owner', in: 'path', required: true, schema: { type: 'string' } },
    },
    requestBodies: {
      NewIssue: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title'],
              properties: {
                title: { type: 'string', maxLength: 256, 'x-internal': true },
                description: { type: 'string', description: 'A property named like a keyword' },
              },
            },
          },
        },
      },
    },
    responses: {
      NotFound: {
        description: 'missing',
        content: { 'application/json': { schema: { type: 'object' } } },
      },
    },
    schemas: {
      Issue: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int64' },
          parent: { $ref: '#/components/schemas/Issue' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      User: {
        type: 'object',
        properties: { login: { type: 'string' }, team: { $ref: '#/components/schemas/Team' } },
      },
      Team: { type: 'object', properties: { name: { type: 'string' } } },
    },
    securitySchemes: {
      token: { type: 'http', scheme: 'bearer', description: 'A token' },
      oauth: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://example.com/authorize',
            tokenUrl: 'https://example.com/token',
            scopes: { repo: 'Full control of repositories' },
          },
        },
      },
    },
    pathItems: { Aliased: { get: { responses: { '204': { description: 'none' } } } } },
  },
};

describe('listOperations', () => {
  it('lists every operation, following path item refs', () => {
    expect(listOperations(document)).toEqual([
      {
        method: 'get',
        path: '/repos/{owner}/{repo}/issues',
        operationId: 'listIssues',
        summary: 'List issues in a repository',
      },
      {
        method: 'post',
        path: '/repos/{owner}/{repo}/issues',
        operationId: 'createIssue',
        deprecated: true,
      },
      { method: 'get', path: '/aliased' },
    ]);
  });
});

describe('findOperation', () => {
  it('finds an operation by operationId', () => {
    expect(findOperation(document, 'createIssue')).toMatchObject({ method: 'post' });
  });

  it('finds an operation by method and path, whatever its parameters are called', () => {
    expect(findOperation(document, 'GET /repos/{o}/{r}/issues')).toMatchObject({
      operationId: 'listIssues',
    });
  });

  it('finds nothing for an unknown operation', () => {
    expect(findOperation(document, 'DELETE /repos/{owner}/{repo}/issues')).toBeUndefined();
  });
});

describe('describeOperation', () => {
  const issues = { method: 'get', path: '/repos/{owner}/{repo}/issues' };

  it('merges path and operation parameters with their effective style and explode', () => {
    expect(describeOperation(document, issues)?.parameters).toEqual([
      {
        name: 'owner',
        in: 'path',
        required: true,
        style: 'simple',
        explode: false,
        schema: { type: 'string' },
      },
      {
        name: 'repo',
        in: 'path',
        required: true,
        style: 'simple',
        explode: false,
        schema: { type: 'string' },
      },
      {
        name: 'labels',
        in: 'query',
        required: false,
        style: 'form',
        explode: true,
        schema: { type: 'array', items: { type: 'string' } },
      },
      {
        name: 'ids',
        in: 'query',
        required: false,
        style: 'form',
        explode: false,
        schema: { type: 'array' },
      },
      {
        name: 'per_page',
        in: 'query',
        required: false,
        style: 'form',
        explode: true,
        schema: { type: 'integer', maximum: 100 },
      },
      {
        name: 'page',
        in: 'query',
        required: false,
        style: 'form',
        explode: true,
        schema: { type: 'integer' },
      },
    ]);
  });

  it('inlines response schemas, keeps recursive refs and leaves out examples', () => {
    expect(describeOperation(document, issues)?.responses).toEqual({
      '200': {
        description: 'ok',
        content: {
          'application/json': {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', format: 'int64' },
                parent: { $ref: '#/components/schemas/Issue' },
                user: {
                  type: 'object',
                  properties: {
                    login: { type: 'string' },
                    team: { type: 'object', properties: { name: { type: 'string' } } },
                  },
                },
              },
            },
          },
        },
      },
      '404': { description: 'missing', contentTypes: ['application/json'] },
    });
  });

  it('stops inlining at the given depth', () => {
    const { responses } = describeOperation(document, issues, { depth: 1 }) ?? {};
    expect(responses).toMatchObject({
      '200': {
        content: {
          'application/json': {
            items: { properties: { user: { $ref: '#/components/schemas/User' } } },
          },
        },
      },
    });
  });

  it('describes servers, security and pagination', () => {
    expect(describeOperation(document, issues)).toMatchObject({
      operation: 'GET /repos/{owner}/{repo}/issues',
      operationId: 'listIssues',
      servers: [
        {
          url: 'https://{region}.example.com',
          variables: { region: { default: 'us', enum: ['us', 'eu'] } },
        },
      ],
      security: {
        requirements: [{ token: [] }],
        schemes: { token: { type: 'http', scheme: 'bearer' } },
      },
      pagination: {
        proposal: { style: 'page', request: { pageParam: 'page', sizeParam: 'per_page' } },
      },
    });
  });

  it('describes the request body, with properties named like keywords kept', () => {
    expect(
      describeOperation(document, { method: 'post', path: '/repos/{owner}/{repo}/issues' })
    ).toMatchObject({
      deprecated: true,
      security: {
        requirements: [{ oauth: ['repo'] }],
        schemes: {
          oauth: {
            type: 'oauth2',
            flows: {
              authorizationCode: {
                authorizationUrl: 'https://example.com/authorize',
                tokenUrl: 'https://example.com/token',
              },
            },
          },
        },
      },
      requestBody: {
        required: true,
        content: {
          'application/json': {
            type: 'object',
            required: ['title'],
            properties: {
              title: { type: 'string', maxLength: 256 },
              description: { type: 'string', description: 'A property named like a keyword' },
            },
          },
        },
      },
    });
  });

  it('returns undefined for an operation the document lacks', () => {
    expect(describeOperation(document, { method: 'put', path: '/aliased' })).toBeUndefined();
  });
});
