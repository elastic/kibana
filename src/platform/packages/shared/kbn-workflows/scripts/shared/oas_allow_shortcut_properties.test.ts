/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { allowShortcutProperties, getShortcutProperties } from './oas_allow_shortcut_properties';
import type { SpecSchemaJson } from './spec_schema_json';

const makeDocument = (
  schemas: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>
): OpenAPIV3.Document => ({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  paths: {},
  components: { schemas },
});

describe('getShortcutProperties', () => {
  it('collects types with a shortcut property and skips FunctionScoreQuery', () => {
    const spec: SpecSchemaJson = {
      endpoints: [],
      types: [
        {
          kind: 'interface',
          name: { namespace: '_types.query_dsl', name: 'TermQuery' },
          shortcutProperty: 'value',
        },
        {
          kind: 'interface',
          name: { namespace: '_types.query_dsl', name: 'FunctionScoreQuery' },
          shortcutProperty: 'functions',
        },
        { kind: 'interface', name: { namespace: '_types.query_dsl', name: 'BoolQuery' } },
      ],
    };

    expect(getShortcutProperties(spec)).toEqual(new Map([['_types.query_dsl.TermQuery', 'value']]));
  });
});

describe('allowShortcutProperties', () => {
  const fieldValue: OpenAPIV3.ReferenceObject = { $ref: '#/components/schemas/_types.FieldValue' };

  it('wraps the schema in anyOf with the full object first and the shortcut from an allOf part', () => {
    const termQuery: OpenAPIV3.SchemaObject = {
      allOf: [
        { $ref: '#/components/schemas/_types.query_dsl.QueryBase' },
        { type: 'object', properties: { value: fieldValue }, required: ['value'] },
      ],
    };
    const document = makeDocument({ '_types.query_dsl.TermQuery': termQuery });

    allowShortcutProperties(document, new Map([['_types.query_dsl.TermQuery', 'value']]));

    expect(document.components?.schemas?.['_types.query_dsl.TermQuery']).toEqual({
      anyOf: [termQuery, fieldValue],
    });
  });

  it('uses top-level properties', () => {
    const script: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: { source: { type: 'string' } },
    };
    const document = makeDocument({ '_types.Script': script });

    allowShortcutProperties(document, new Map([['_types.Script', 'source']]));

    expect(document.components?.schemas?.['_types.Script']).toEqual({
      anyOf: [script, { type: 'string' }],
    });
  });

  it('leaves schemas unchanged when the schema or the property is missing', () => {
    const other: OpenAPIV3.SchemaObject = { type: 'object', properties: {} };
    const document = makeDocument({ '_types.Other': other });

    allowShortcutProperties(
      document,
      new Map([
        ['_types.Other', 'value'],
        ['_types.Missing', 'value'],
      ])
    );

    expect(document.components?.schemas).toEqual({ '_types.Other': other });
  });
});
