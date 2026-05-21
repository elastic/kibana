/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { allowShortQuerySyntax } from './oas_allow_short_query_syntax';

const makeDocument = (
  schemas: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject> = {}
): OpenAPIV3.Document => ({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  paths: {},
  components: { schemas },
});

describe('allowShortQuerySyntax', () => {
  it('should return document as-is when components.schemas is missing', () => {
    const doc: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };
    expect(allowShortQuerySyntax(doc)).toBe(doc);
  });

  it('should wrap matching schema names in anyOf with a string alternative', () => {
    const originalSchema: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: { query: { type: 'string' } },
    };
    const doc = makeDocument({
      '_types.query_dsl.MatchQuery': originalSchema,
    });

    const result = allowShortQuerySyntax(doc);
    const schema = result.components!.schemas![
      '_types.query_dsl.MatchQuery'
    ] as OpenAPIV3.SchemaObject;

    expect(schema.anyOf).toEqual([
      { type: 'string', description: 'Short query syntax for match query' },
      originalSchema,
    ]);
  });

  it('should leave non-matching schema names unchanged', () => {
    const originalSchema: OpenAPIV3.SchemaObject = { type: 'object' };
    const doc = makeDocument({ 'some.other.Schema': originalSchema });

    allowShortQuerySyntax(doc);

    expect(doc.components!.schemas!['some.other.Schema']).toBe(originalSchema);
  });

  it('should leave $ref schemas unchanged', () => {
    const refSchema: OpenAPIV3.ReferenceObject = { $ref: '#/components/schemas/Other' };
    const doc = makeDocument({
      '_types.query_dsl.MatchQuery': refSchema,
    });

    allowShortQuerySyntax(doc);

    expect(doc.components!.schemas!['_types.query_dsl.MatchQuery']).toBe(refSchema);
  });
});
