/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { RUNTIME_FIELD_COMPOSITE_TYPE } from '@kbn/data-views-plugin/common';
import { fromStoredFields } from './from_stored_fields';

describe('fromStoredFields.runtime_fields', () => {
  describe('default arguments', () => {
    it('does not include runtime_fields when called with no arguments', () => {
      const { runtime_fields: result } = fromStoredFields();
      expect(result).toBeUndefined();
    });

    it('does not include runtime_fields when runtimeFields is empty', () => {
      const { runtime_fields: result } = fromStoredFields({});
      expect(result).toBeUndefined();
    });
  });

  describe('primitive runtime fields', () => {
    describe('basic mapping', () => {
      it('maps the object key to the name property', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_field: { type: 'keyword' },
        });
        expect(result.name).toBe('my_field');
      });

      it('maps runtimeField.type to type', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({ my_field: { type: 'long' } });
        expect(result.type).toBe('long');
      });

      it('maps runtimeField.script.source to script', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_field: { type: 'keyword', script: { source: 'emit("hello")' } },
        });
        expect(result.script).toBe('emit("hello")');
      });

      it('returns undefined for script when runtimeField.script is absent', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_field: { type: 'keyword' },
        });
        expect(result.script).toBeUndefined();
      });
    });

    describe('format handling', () => {
      it('sets format when fieldFormats entry has an id', () => {
        const { runtime_fields: [field] = [] } = fromStoredFields(
          { my_field: { type: 'date' } },
          { my_field: { id: 'date', params: { pattern: 'MM/DD/YYYY' } } }
        );
        if (field.type === RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected primitive');
        expect(field.format).toEqual({ type: 'date', params: { pattern: 'MM/DD/YYYY' } });
      });

      it('sets format to undefined when fieldFormats entry has no id', () => {
        const { runtime_fields: [field] = [] } = fromStoredFields(
          { my_field: { type: 'keyword' } },
          { my_field: {} }
        );
        if (field.type === RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected primitive');
        expect(field.format).toBeUndefined();
      });

      it('sets format to undefined when fieldFormats has no entry for the field', () => {
        const { runtime_fields: [field] = [] } = fromStoredFields(
          { my_field: { type: 'keyword' } },
          { other_field: { id: 'string' } }
        );
        if (field.type === RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected primitive');
        expect(field.format).toBeUndefined();
      });

      it('passes format.params through as-is', () => {
        const params = { pattern: 'YYYY', timezone: 'UTC' };
        const { runtime_fields: [field] = [] } = fromStoredFields(
          { my_field: { type: 'date' } },
          { my_field: { id: 'date', params } }
        );
        if (field.type === RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected primitive');
        expect(field.format?.params).toBe(params);
      });

      it('passes undefined params through when params is not set', () => {
        const { runtime_fields: [field] = [] } = fromStoredFields(
          { my_field: { type: 'keyword' } },
          { my_field: { id: 'string' } }
        );
        if (field.type === RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected primitive');
        expect(field.format).toEqual({ type: 'string', params: undefined });
      });
    });

    describe('field attributes', () => {
      it('maps fieldAttrs customLabel to custom_label', () => {
        const { runtime_fields: [field] = [] } = fromStoredFields(
          { my_field: { type: 'keyword' } },
          {},
          {
            my_field: { customLabel: 'My Field' },
          }
        );
        if (field.type === RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected primitive');
        expect(field.custom_label).toBe('My Field');
      });

      it('maps fieldAttrs customDescription to custom_description', () => {
        const { runtime_fields: [field] = [] } = fromStoredFields(
          { my_field: { type: 'keyword' } },
          {},
          {
            my_field: { customDescription: 'A description' },
          }
        );
        if (field.type === RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected primitive');
        expect(field.custom_description).toBe('A description');
      });

      it('returns undefined for all field attrs when no entry exists for the field', () => {
        const { runtime_fields: [field] = [] } = fromStoredFields(
          { my_field: { type: 'keyword' } },
          {},
          {}
        );
        if (field.type === RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected primitive');
        expect(field.custom_label).toBeUndefined();
        expect(field.custom_description).toBeUndefined();
      });
    });
  });

  describe('composite runtime fields', () => {
    describe('basic mapping', () => {
      it('sets type to RUNTIME_FIELD_COMPOSITE_TYPE', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_composite: { type: RUNTIME_FIELD_COMPOSITE_TYPE, fields: {} },
        });
        expect(result.type).toBe(RUNTIME_FIELD_COMPOSITE_TYPE);
      });

      it('maps the object key to name', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_composite: { type: RUNTIME_FIELD_COMPOSITE_TYPE, fields: {} },
        });
        expect(result.name).toBe('my_composite');
      });

      it('maps runtimeField.script.source to script', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_composite: {
            type: RUNTIME_FIELD_COMPOSITE_TYPE,
            fields: {},
            script: { source: 'emit("a", "b")' },
          },
        });
        expect(result.script).toBe('emit("a", "b")');
      });

      it('returns undefined for script when absent', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_composite: { type: RUNTIME_FIELD_COMPOSITE_TYPE, fields: {} },
        });
        expect(result.script).toBeUndefined();
      });

      it('returns fields as an array', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_composite: {
            type: RUNTIME_FIELD_COMPOSITE_TYPE,
            fields: { sub_a: { type: 'keyword' }, sub_b: { type: 'long' } },
          },
        });
        if (result.type !== RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected composite');
        expect(result.fields).toHaveLength(2);
      });
    });

    describe('subfield key construction', () => {
      it('looks up subfield format using "parentName.subFieldName"', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields(
          {
            my_composite: { type: RUNTIME_FIELD_COMPOSITE_TYPE, fields: { sub: { type: 'date' } } },
          },
          { 'my_composite.sub': { id: 'date', params: { pattern: 'MM/DD/YYYY' } } }
        );
        if (result.type !== RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected composite');
        expect(result.fields[0].format).toEqual({
          type: 'date',
          params: { pattern: 'MM/DD/YYYY' },
        });
      });

      it('looks up subfield attrs using "parentName.subFieldName"', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields(
          {
            my_composite: {
              type: RUNTIME_FIELD_COMPOSITE_TYPE,
              fields: { sub: { type: 'keyword' } },
            },
          },
          {},
          { 'my_composite.sub': { customLabel: 'Sub Label', customDescription: 'desc' } }
        );
        if (result.type !== RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected composite');
        expect(result.fields[0].custom_label).toBe('Sub Label');
        expect(result.fields[0].custom_description).toBe('desc');
      });

      it('sets subfield name to the subfield key (not the dotted path)', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_composite: {
            type: RUNTIME_FIELD_COMPOSITE_TYPE,
            fields: { sub_field: { type: 'keyword' } },
          },
        });
        if (result.type !== RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected composite');
        expect(result.fields[0].name).toBe('sub_field');
      });

      it('maps subfield type from runtimeField.fields entry', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_composite: { type: RUNTIME_FIELD_COMPOSITE_TYPE, fields: { sub: { type: 'ip' } } },
        });
        if (result.type !== RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected composite');
        expect(result.fields[0].type).toBe('ip');
      });
    });

    describe('subfield format handling', () => {
      it('sets subfield format to undefined when no matching entry', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields(
          {
            my_composite: {
              type: RUNTIME_FIELD_COMPOSITE_TYPE,
              fields: { sub: { type: 'keyword' } },
            },
          },
          {}
        );
        if (result.type !== RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected composite');
        expect(result.fields[0].format).toBeUndefined();
      });

      it('sets subfield format to undefined when entry exists but has no id', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields(
          {
            my_composite: {
              type: RUNTIME_FIELD_COMPOSITE_TYPE,
              fields: { sub: { type: 'keyword' } },
            },
          },
          { 'my_composite.sub': {} }
        );
        if (result.type !== RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected composite');
        expect(result.fields[0].format).toBeUndefined();
      });
    });

    describe('subfield field attributes', () => {
      it('returns undefined for all attrs when no matching fieldAttrs entry', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_composite: {
            type: RUNTIME_FIELD_COMPOSITE_TYPE,
            fields: { sub: { type: 'keyword' } },
          },
        });
        if (result.type !== RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected composite');
        expect(result.fields[0].custom_label).toBeUndefined();
        expect(result.fields[0].custom_description).toBeUndefined();
      });
    });

    describe('empty subfields', () => {
      it('returns an empty fields array when runtimeField.fields is an empty object', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_composite: { type: RUNTIME_FIELD_COMPOSITE_TYPE, fields: {} },
        });
        if (result.type !== RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected composite');
        expect(result.fields).toEqual([]);
      });

      it('returns an empty fields array when runtimeField.fields is absent', () => {
        const { runtime_fields: [result] = [] } = fromStoredFields({
          my_composite: { type: RUNTIME_FIELD_COMPOSITE_TYPE },
        });
        if (result.type !== RUNTIME_FIELD_COMPOSITE_TYPE) throw new Error('expected composite');
        expect(result.fields).toEqual([]);
      });
    });
  });

  describe('multiple fields', () => {
    it('returns one result per key in runtimeFieldMap', () => {
      const { runtime_fields: result = [] } = fromStoredFields({
        field_a: { type: 'keyword' },
        field_b: { type: 'long' },
        field_c: { type: RUNTIME_FIELD_COMPOSITE_TYPE, fields: {} },
      });
      expect(result).toHaveLength(3);
    });

    it('correctly maps each field independently', () => {
      const { runtime_fields: result = [] } = fromStoredFields(
        {
          field_a: { type: 'keyword', script: { source: 'emit("a")' } },
          field_b: { type: 'long' },
        },
        { field_b: { id: 'number' } }
      );
      const fieldA = result.find((f) => f.name === 'field_a');
      const fieldB = result.find((f) => f.name === 'field_b');
      if (!fieldA || fieldA.type === RUNTIME_FIELD_COMPOSITE_TYPE)
        throw new Error('expected primitive');
      if (!fieldB || fieldB.type === RUNTIME_FIELD_COMPOSITE_TYPE)
        throw new Error('expected primitive');
      expect(fieldA.script).toBe('emit("a")');
      expect(fieldA.format).toBeUndefined();
      expect(fieldB.format).toEqual({ type: 'number', params: undefined });
    });
  });
});

describe('fromStoredFields.field_settings', () => {
  it('emits indexed field settings when not owned by runtime fields', () => {
    const result = fromStoredFields(
      { rt: { type: 'keyword' } },
      { mapped: { id: 'bytes' } },
      { mapped: { customLabel: 'Mapped' } }
    );

    expect(result.field_settings).toEqual({
      mapped: {
        format: { type: 'bytes', params: undefined },
        custom_label: 'Mapped',
      },
    });
  });

  it('omits runtime field and runtime composite subfield keys from field_settings', () => {
    const result = fromStoredFields(
      {
        rt: { type: 'keyword' },
        parent: { type: RUNTIME_FIELD_COMPOSITE_TYPE, fields: { child: { type: 'keyword' } } },
      },
      { rt: { id: 'string' }, 'parent.child': { id: 'number' }, mapped: { id: 'bytes' } },
      { rt: { customLabel: 'runtime' }, 'parent.child': { customLabel: 'sub' } }
    );

    expect(result.field_settings).toEqual({
      mapped: {
        format: { type: 'bytes', params: undefined },
      },
    });
  });
});
