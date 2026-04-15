/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { getGenerationContext } from './get_generation_context';
import type { OpenApiDocument } from './openapi_types';

const json200 = (schema: OpenAPIV3.SchemaObject): OpenAPIV3.ResponseObject => ({
  description: 'ok',
  content: { 'application/json': { schema } },
});

function minimalGetOperation(
  operation: Partial<OpenAPIV3.OperationObject> & Pick<OpenAPIV3.OperationObject, 'operationId'>
): OpenApiDocument {
  return {
    openapi: '3.0.0',
    info: { title: 'fixture', version: '1' },
    paths: {
      '/fixture': {
        get: {
          'x-codegen-enabled': true,
          responses: { '200': json200({ type: 'object', properties: {} }) },
          ...operation,
        },
      },
    },
  };
}

describe('getGenerationContext zodHelpersImports', () => {
  it('imports BooleanFromString for boolean query parameters (query coercion)', () => {
    const ctx = getGenerationContext(
      minimalGetOperation({
        operationId: 'WithBoolQuery',
        parameters: [
          {
            name: 'enabled',
            in: 'query',
            required: false,
            schema: { type: 'boolean' },
          },
        ],
      }),
      {}
    );
    expect(ctx.zodHelpersImports).toEqual(['BooleanFromString']);
    expect(ctx.hasZodHelpersImports).toBe(true);
    expect(ctx.useZodHelpers).toBe(ctx.hasZodHelpersImports);
  });

  it('imports ArrayFromString for array-of-string query parameters', () => {
    const ctx = getGenerationContext(
      minimalGetOperation({
        operationId: 'WithArrayQuery',
        parameters: [
          {
            name: 'ids',
            in: 'query',
            required: false,
            schema: { type: 'array', items: { type: 'string' } },
          },
        ],
      }),
      {}
    );
    expect(ctx.zodHelpersImports).toEqual(['ArrayFromString']);
  });

  it('orders multiple helpers as isValidDateMath, isNonEmptyString, ArrayFromString, BooleanFromString', () => {
    const ctx = getGenerationContext(
      minimalGetOperation({
        operationId: 'Combo',
        parameters: [
          {
            name: 'ids',
            in: 'query',
            required: false,
            schema: { type: 'array', items: { type: 'string' } },
          },
          {
            name: 'flag',
            in: 'query',
            required: false,
            schema: { type: 'boolean' },
          },
        ],
        responses: {
          '200': json200({
            type: 'object',
            properties: {
              a: { type: 'string', format: 'date-math' },
              b: { type: 'string', format: 'nonempty' },
            },
          }),
        },
      }),
      {}
    );
    expect(ctx.zodHelpersImports).toEqual([
      'isValidDateMath',
      'isNonEmptyString',
      'ArrayFromString',
      'BooleanFromString',
    ]);
  });

  it('imports isNonEmptyString when a component schema uses format nonempty', () => {
    const doc: OpenApiDocument = {
      openapi: '3.0.0',
      info: { title: 'fixture', version: '1' },
      paths: {
        '/fixture': {
          get: {
            'x-codegen-enabled': true,
            operationId: 'WithComponent',
            responses: {
              '200': json200({
                type: 'object',
                properties: { id: { $ref: '#/components/schemas/NonEmptyId' } },
              }),
            },
          },
        },
      },
      components: {
        schemas: {
          NonEmptyId: { type: 'string', format: 'nonempty' },
        },
      },
    };
    const ctx = getGenerationContext(doc, {});
    expect(ctx.zodHelpersImports).toContain('isNonEmptyString');
  });

  it('imports isValidDateMath when the response body uses format date-math', () => {
    const ctx = getGenerationContext(
      minimalGetOperation({
        operationId: 'WithDateMathBody',
        responses: {
          '200': json200({
            type: 'object',
            properties: { range: { type: 'string', format: 'date-math' } },
          }),
        },
      }),
      {}
    );
    expect(ctx.zodHelpersImports).toEqual(['isValidDateMath']);
  });

  it('does not add helpers for local query $ref that only references an enum (emitted as schema id)', () => {
    const doc: OpenApiDocument = {
      openapi: '3.0.0',
      info: { title: 'fixture', version: '1' },
      paths: {
        '/fixture': {
          get: {
            'x-codegen-enabled': true,
            operationId: 'WithLocalEnumRef',
            parameters: [
              {
                name: 'sort',
                in: 'query',
                required: false,
                schema: { $ref: '#/components/schemas/SortField' },
              },
            ],
            responses: { '200': json200({ type: 'object', properties: {} }) },
          },
        },
      },
      components: {
        schemas: {
          SortField: { type: 'string', enum: ['a', 'b'] },
        },
      },
    };
    const ctx = getGenerationContext(doc, {});
    expect(ctx.zodHelpersImports).toEqual([]);
    expect(ctx.hasZodHelpersImports).toBe(false);
  });

  it('does not treat external file $ref in query as requiring zod helpers in this document', () => {
    const ctx = getGenerationContext(
      minimalGetOperation({
        operationId: 'WithExternalRef',
        parameters: [
          {
            name: 'sort',
            in: 'query',
            required: false,
            schema: {
              $ref: '../other.schema.yaml#/components/schemas/SortField',
            },
          },
        ],
      }),
      {}
    );
    expect(ctx.zodHelpersImports).toEqual([]);
  });

  it('after resolving a local object $ref on a query param, still detects nested boolean fields', () => {
    const doc: OpenApiDocument = {
      openapi: '3.0.0',
      info: { title: 'fixture', version: '1' },
      paths: {
        '/fixture': {
          get: {
            'x-codegen-enabled': true,
            operationId: 'NestedBoolAfterRef',
            parameters: [
              {
                name: 'q',
                in: 'query',
                required: true,
                schema: { $ref: '#/components/schemas/QueryShape' },
              },
            ],
            responses: { '200': json200({ type: 'object', properties: {} }) },
          },
        },
      },
      components: {
        schemas: {
          QueryShape: {
            type: 'object',
            properties: {
              flag: { type: 'boolean' },
            },
          },
        },
      },
    };
    const ctx = getGenerationContext(doc, {});
    expect(ctx.zodHelpersImports).toEqual(['BooleanFromString']);
  });

  it('collects string format helpers from every components.schemas entry (each is emitted as zod)', () => {
    const doc: OpenApiDocument = {
      openapi: '3.0.0',
      info: { title: 'fixture', version: '1' },
      paths: {
        '/fixture': {
          get: {
            'x-codegen-enabled': true,
            operationId: 'UnusedComponent',
            responses: {
              '200': json200({
                type: 'object',
                properties: { name: { type: 'string' } },
              }),
            },
          },
        },
      },
      components: {
        schemas: {
          UnusedNonEmpty: { type: 'string', format: 'nonempty' },
        },
      },
    };
    const ctx = getGenerationContext(doc, {});
    expect(ctx.zodHelpersImports).toEqual(['isNonEmptyString']);
  });
});
