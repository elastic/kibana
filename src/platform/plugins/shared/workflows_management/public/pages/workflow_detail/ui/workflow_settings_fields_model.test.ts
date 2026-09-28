/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  constantsToYamlRecord,
  coerceConstantValue,
  parseConstsToFields,
  parseOutputsToFields,
  outputsToJsonSchema,
} from './workflow_settings_fields_model';

describe('workflow_settings_fields_model', () => {
  it('round-trips consts map preserving order and types', () => {
    const fields = parseConstsToFields({
      region: 'us-east-1',
      retries: 3,
      dry_run: true,
    });
    expect(fields.map((f) => f.name)).toEqual(['region', 'retries', 'dry_run']);
    expect(fields[1].type).toBe('number');
    expect(constantsToYamlRecord(fields)).toEqual({
      region: 'us-east-1',
      retries: 3,
      dry_run: true,
    });
  });

  it('rejects template expressions in constant values', () => {
    expect(coerceConstantValue('string', '{{ consts.x }}')).toEqual({
      ok: false,
      error: 'expression',
    });
  });

  it('serializes outputs with x-kibana-value and fallback default', () => {
    const fields = parseOutputsToFields([
      {
        name: 'summary',
        type: 'string',
        value: '{{ steps.log.output }}',
        default: 'n/a',
      },
    ]);
    expect(fields[0].value).toBe('{{ steps.log.output }}');
    expect(fields[0].fallback).toBe('n/a');
    const schema = outputsToJsonSchema(fields);
    expect(schema?.properties?.summary).toMatchObject({
      type: 'string',
      default: 'n/a',
      'x-kibana-value': '{{ steps.log.output }}',
    });
  });
});
