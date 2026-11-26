/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import {
  allowSpecAdditionalProperties,
  getSchemaNamesReachedFrom,
  getTypesWithAdditionalProperties,
} from './oas_allow_additional_properties';
import type { SpecSchemaJson } from './spec_schema_json';

// Every schema in `schemas` is reachable from a request body unless listed in `responseOnly`.
const makeDocument = (
  schemas: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>,
  responseOnly: string[] = []
): OpenAPIV3.Document => ({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  paths: {},
  components: {
    schemas,
    requestBodies: {
      search: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: Object.fromEntries(
                Object.keys(schemas)
                  .filter((name) => !responseOnly.includes(name))
                  .map((name) => [name, { $ref: `#/components/schemas/${name}` }])
              ),
            },
          },
        },
      },
    },
  },
});

describe('getTypesWithAdditionalProperties', () => {
  it('collects types with an AdditionalProperty or AdditionalProperties behavior', () => {
    const spec: SpecSchemaJson = {
      endpoints: [],
      types: [
        {
          kind: 'interface',
          name: { namespace: '_types', name: 'SortOptions' },
          behaviors: [{ type: { namespace: '_spec_utils', name: 'AdditionalProperty' } }],
        },
        {
          kind: 'interface',
          name: { namespace: '_types', name: 'ErrorCause' },
          behaviors: [{ type: { namespace: '_spec_utils', name: 'AdditionalProperties' } }],
        },
        {
          kind: 'interface',
          name: { namespace: '_types', name: 'Other' },
          behaviors: [{ type: { namespace: '_spec_utils', name: 'CommonQueryParameters' } }],
        },
        { kind: 'interface', name: { namespace: '_types', name: 'Plain' } },
      ],
    };

    expect(getTypesWithAdditionalProperties(spec)).toEqual(
      new Set(['_types.SortOptions', '_types.ErrorCause'])
    );
  });
});

describe('allowSpecAdditionalProperties', () => {
  const openObject: OpenAPIV3.SchemaObject = { type: 'object' };

  it('wraps a plain object schema in allOf with an open object', () => {
    const sortOptions: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: { _score: { type: 'object' } },
    };
    const document = makeDocument({ '_types.SortOptions': sortOptions });

    allowSpecAdditionalProperties(document, new Set(['_types.SortOptions']));

    expect(document.components?.schemas?.['_types.SortOptions']).toEqual({
      allOf: [sortOptions, openObject],
    });
  });

  it('appends an open object to an existing allOf', () => {
    const base: OpenAPIV3.ReferenceObject = { $ref: '#/components/schemas/_types.QueryBase' };
    const fields: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: { distance: { type: 'string' } },
    };
    const document = makeDocument({ '_types.GeoDistanceQuery': { allOf: [base, fields] } });

    allowSpecAdditionalProperties(document, new Set(['_types.GeoDistanceQuery']));

    expect(document.components?.schemas?.['_types.GeoDistanceQuery']).toEqual({
      allOf: [base, fields, openObject],
    });
  });

  it('leaves a schema that already has an open object in allOf unchanged', () => {
    const termsQuery: OpenAPIV3.SchemaObject = {
      allOf: [{ $ref: '#/components/schemas/_types.QueryBase' }, { type: 'object' }],
    };
    const document = makeDocument({ '_types.TermsQuery': termsQuery });

    allowSpecAdditionalProperties(document, new Set(['_types.TermsQuery', '_types.Missing']));

    expect(document.components?.schemas).toEqual({ '_types.TermsQuery': termsQuery });
  });

  it('leaves schemas that no request body reaches unchanged', () => {
    const multiBucketBase: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: { buckets: { type: 'array', items: {} } },
    };
    const document = makeDocument({ '_types.MultiBucketBase': multiBucketBase }, [
      '_types.MultiBucketBase',
    ]);

    allowSpecAdditionalProperties(document, new Set(['_types.MultiBucketBase']));

    expect(document.components?.schemas?.['_types.MultiBucketBase']).toBe(multiBucketBase);
  });
});

describe('getSchemaNamesReachedFrom', () => {
  it('follows refs through other schemas and stops at cycles', () => {
    const schemas = {
      A: { type: 'object', properties: { b: { $ref: '#/components/schemas/B' } } },
      B: { type: 'array', items: { $ref: '#/components/schemas/A' } },
      C: { type: 'object' },
    };

    expect(getSchemaNamesReachedFrom({ $ref: '#/components/schemas/A' }, schemas)).toEqual(
      new Set(['A', 'B'])
    );
  });
});
