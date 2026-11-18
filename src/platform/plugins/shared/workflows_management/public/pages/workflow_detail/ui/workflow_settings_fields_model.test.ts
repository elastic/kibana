/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  coerceConstantValue,
  constantsToYamlRecord,
  outputsToJsonSchema,
  parseConstsToFields,
  parseOutputsToFields,
  writeRootYamlMapping,
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

  it('serializes an output fallback as the JSON Schema default and nothing the engine does not know', () => {
    const fields = parseOutputsToFields([{ name: 'summary', type: 'string', default: 'n/a' }]);
    expect(fields[0].fallback).toBe('n/a');

    const schema = outputsToJsonSchema(fields);

    expect(schema?.properties?.summary).toEqual({ type: 'string', default: 'n/a' });
  });

  it('ignores an unsupported `value` on a legacy output instead of carrying it along', () => {
    const fields = parseOutputsToFields([
      { name: 'summary', type: 'string', value: '{{ steps.log.output }}' },
    ]);

    expect(fields[0]).not.toHaveProperty('value');
    expect(JSON.stringify(outputsToJsonSchema(fields))).not.toContain('steps.log.output');
  });

  it('round-trips JSON Schema outputs without adding custom keys', () => {
    const outputs = { properties: { total: { type: 'number', description: 'Sum' } } };

    const schema = outputsToJsonSchema(parseOutputsToFields(outputs));

    expect(schema?.properties?.total).toMatchObject({ type: 'number', description: 'Sum' });
    expect(Object.keys(schema?.properties?.total ?? {}).some((key) => key.startsWith('x-'))).toBe(
      false
    );
  });

  describe('writeRootYamlMapping', () => {
    const TWO_SPACES = 'name: demo\ntriggers:\n  - type: manual\nsteps: []\n';
    const FOUR_SPACES = 'name: demo\ntriggers:\n    - type: manual\nsteps: []\n';

    it('adds the mapping at the document root', () => {
      const next = writeRootYamlMapping(TWO_SPACES, 'consts', { limit: 5 });

      expect(next).toContain('consts:\n  limit: 5');
      expect(next).toContain('name: demo');
    });

    it('removes the mapping when the value is undefined', () => {
      const withConsts = writeRootYamlMapping(TWO_SPACES, 'consts', { limit: 5 });

      expect(writeRootYamlMapping(withConsts, 'consts', undefined)).toBe(TWO_SPACES);
    });

    it('keeps a four-space document at four spaces', () => {
      const next = writeRootYamlMapping(FOUR_SPACES, 'consts', { limit: 5 });

      expect(next).toContain('consts:\n    limit: 5');
      expect(next).toContain('triggers:\n    - type: manual');
    });
  });
});
