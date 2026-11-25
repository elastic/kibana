/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { addPropertyAliases, getPropertyAliases } from './oas_add_property_aliases';
import type { SpecSchemaJson } from './spec_schema_json';

const aggregations: OpenAPIV3.SchemaObject = {
  type: 'object',
  additionalProperties: { $ref: '#/components/schemas/_types.aggregations.AggregationContainer' },
};

const spec: SpecSchemaJson = {
  endpoints: [
    { name: 'search', request: { namespace: '_global.search', name: 'Request' } },
    { name: 'info', request: null },
  ],
  types: [
    {
      kind: 'request',
      name: { namespace: '_global.search', name: 'Request' },
      body: {
        kind: 'properties',
        properties: [{ name: 'aggregations', aliases: ['aggs'] }, { name: 'query' }],
      },
    },
    {
      kind: 'interface',
      name: { namespace: '_types.aggregations', name: 'AggregationContainer' },
      properties: [{ name: 'aggregations', aliases: ['aggs'] }],
    },
    {
      kind: 'interface',
      name: { namespace: '_types.query_dsl', name: 'BoolQuery' },
      properties: [{ name: 'must' }],
    },
  ],
};

describe('getPropertyAliases', () => {
  it('maps interface types to schema names and requests to endpoint names', () => {
    expect(getPropertyAliases(spec)).toEqual({
      schemas: new Map([
        ['_types.aggregations.AggregationContainer', new Map([['aggregations', ['aggs']]])],
      ]),
      requestBodies: new Map([['search', new Map([['aggregations', ['aggs']]])]]),
    });
  });
});

describe('addPropertyAliases', () => {
  it('adds aliases to component schemas, including allOf parts, and to request bodies', () => {
    const document: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          '_types.aggregations.AggregationContainer': {
            allOf: [{ type: 'object', properties: { aggregations } }],
          },
        },
        requestBodies: {
          search: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { aggregations, query: { type: 'object' } } },
              },
            },
          },
        },
      },
    };

    addPropertyAliases(document, getPropertyAliases(spec));

    expect(document.components?.schemas?.['_types.aggregations.AggregationContainer']).toEqual({
      allOf: [{ type: 'object', properties: { aggregations, aggs: aggregations } }],
    });
    expect(
      (document.components?.requestBodies?.search as OpenAPIV3.RequestBodyObject).content[
        'application/json'
      ].schema
    ).toEqual({
      type: 'object',
      properties: { aggregations, aggs: aggregations, query: { type: 'object' } },
    });
  });

  it('keeps an existing property with the alias name', () => {
    const existing: OpenAPIV3.SchemaObject = { type: 'string' };
    const document: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          '_types.aggregations.AggregationContainer': {
            type: 'object',
            properties: { aggregations, aggs: existing },
          },
        },
      },
    };

    addPropertyAliases(document, getPropertyAliases(spec));

    expect(
      (
        document.components?.schemas?.[
          '_types.aggregations.AggregationContainer'
        ] as OpenAPIV3.SchemaObject
      ).properties?.aggs
    ).toBe(existing);
  });

  it('keeps a required property required when it has an alias', () => {
    const document: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          '_types.aggregations.AggregationContainer': {
            type: 'object',
            properties: { aggregations },
            required: ['aggregations'],
          },
        },
      },
    };

    addPropertyAliases(document, getPropertyAliases(spec));

    expect(document.components?.schemas?.['_types.aggregations.AggregationContainer']).toEqual({
      type: 'object',
      properties: { aggregations, aggs: aggregations },
      required: ['aggregations'],
    });
  });
});
