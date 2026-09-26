/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  applyModeChange,
  applyTypeChange,
  createEmptySchemaProperty,
  findStepsReferencingInput,
  isBuilderEditableSchema,
  parseInputsToSchemaProperties,
  schemaPropertiesToJsonSchema,
  validateSchemaPropertyName,
} from './schema_property_model';

describe('schema_property_model', () => {
  describe('validateSchemaPropertyName', () => {
    it('rejects empty, invalid, and duplicate names', () => {
      const a = createEmptySchemaProperty({ name: 'alpha' });
      const b = createEmptySchemaProperty({ name: 'beta' });
      expect(validateSchemaPropertyName('', [a, b], 'x')).toBe('empty');
      expect(validateSchemaPropertyName('1bad', [a, b], 'x')).toBe('invalid');
      expect(validateSchemaPropertyName('alpha', [a, b], 'x')).toBe('duplicate');
      expect(validateSchemaPropertyName('alpha', [a, b], a.id)).toBeNull();
      expect(validateSchemaPropertyName('good_name', [a, b], 'x')).toBeNull();
    });
  });

  describe('mode', () => {
    it('clears default when leaving "Use a default"', () => {
      const field = createEmptySchemaProperty({ mode: 'default', defaultValue: 'x' });
      expect(applyModeChange(field, 'required')).toEqual(
        expect.objectContaining({ mode: 'required', defaultValue: '' })
      );
      expect(applyModeChange(field, 'none')).toEqual(
        expect.objectContaining({ mode: 'none', defaultValue: '' })
      );
    });

    it('keeps defaultValue when selecting "Use a default"', () => {
      const field = createEmptySchemaProperty({ mode: 'none', defaultValue: '' });
      expect(applyModeChange(field, 'default')).toEqual(
        expect.objectContaining({ mode: 'default', defaultValue: '' })
      );
    });

    it('resets mode and default on type change', () => {
      const field = createEmptySchemaProperty({
        mode: 'default',
        defaultValue: 'hi',
        type: 'string',
        allowedValues: ['a'],
      });
      expect(applyTypeChange(field, 'number')).toEqual(
        expect.objectContaining({
          type: 'number',
          mode: 'none',
          defaultValue: '',
          allowedValues: [],
        })
      );
    });
  });

  describe('JSON Schema round-trip', () => {
    it('serializes required as a parent-level array without per-field default', () => {
      const fields = [
        createEmptySchemaProperty({
          name: 'hostname',
          type: 'string',
          mode: 'required',
          description: 'Host',
        }),
        createEmptySchemaProperty({
          name: 'severity',
          type: 'string',
          mode: 'default',
          allowedValues: ['low', 'high'],
          allowOtherValues: false,
          defaultValue: 'low',
        }),
        createEmptySchemaProperty({
          name: 'note',
          type: 'string',
          mode: 'none',
        }),
      ];
      const schema = schemaPropertiesToJsonSchema(fields);
      // TODO(engine): confirm inputs schema shape
      expect(schema.required).toEqual(['hostname']);
      expect(schema.properties?.hostname).toMatchObject({
        type: 'string',
        description: 'Host',
      });
      expect(schema.properties?.hostname).not.toHaveProperty('default');
      expect(schema.properties?.severity).toMatchObject({
        type: 'string',
        enum: ['low', 'high'],
        default: 'low',
      });
      expect(schema.properties?.note).not.toHaveProperty('default');
      expect(schema.required).not.toContain('note');
      expect(schema.required).not.toContain('severity');
    });

    it('parses legacy array inputs into builder fields', () => {
      const parsed = parseInputsToSchemaProperties([
        { name: 'dry_run', type: 'boolean', required: true },
        { name: 'env', type: 'choice', options: ['dev', 'prod'], default: 'dev' },
      ]);
      expect(parsed).not.toBe('unsupported');
      if (parsed === 'unsupported') return;
      expect(parsed.map((p) => p.name)).toEqual(['dry_run', 'env']);
      expect(parsed[0].mode).toBe('required');
      expect(parsed[1].mode).toBe('default');
      expect(parsed[1].allowedValues).toEqual(['dev', 'prod']);
      expect(parsed[1].defaultValue).toBe('dev');
    });

    it('marks $ref schemas as unsupported for the builder', () => {
      expect(
        isBuilderEditableSchema({
          properties: { payload: { $ref: '#/kibana/definitions/notificationGroup' } },
        })
      ).toBe(false);
      expect(parseInputsToSchemaProperties({ properties: { payload: { $ref: '#/x' } } })).toBe(
        'unsupported'
      );
    });
  });

  describe('findStepsReferencingInput', () => {
    it('returns step names that reference the input', () => {
      const yaml = `
steps:
  - name: notify
    type: console
    with:
      message: "{{ inputs.hostname }}"
  - name: other
    type: console
    with:
      message: plain
`;
      expect(findStepsReferencingInput(yaml, 'hostname')).toEqual(['notify']);
      expect(findStepsReferencingInput(yaml, 'missing')).toEqual([]);
    });
  });
});
