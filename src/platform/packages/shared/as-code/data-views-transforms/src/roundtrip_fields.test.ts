/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { RUNTIME_FIELD_COMPOSITE_TYPE } from '@kbn/data-views-plugin/common';
import {
  AS_CODE_DATA_VIEW_SPEC_TYPE,
  type AsCodeDataViewSpec,
  type AsCodeRuntimeField,
} from '@kbn/as-code-data-views-schema';
import { fromStoredFields } from './from_stored_fields';
import { toStoredDataView } from './to_stored_data_view';

const toStoredFromAsCodeFields = (
  fields: Pick<AsCodeDataViewSpec, 'runtime_fields' | 'field_settings'>
) => {
  const stored = toStoredDataView({
    type: AS_CODE_DATA_VIEW_SPEC_TYPE,
    index_pattern: 'logs-*',
    ...fields,
  });

  if (typeof stored === 'string') {
    throw new Error('Expected inline data view spec');
  }

  return {
    runtimeFieldMap: stored.runtimeFieldMap ?? {},
    fieldFormats: stored.fieldFormats ?? {},
    fieldAttrs: stored.fieldAttrs ?? {},
  };
};

describe('roundtrip: AsCode → stored → AsCode', () => {
  describe('primitive fields', () => {
    it('preserves a minimal field (type + name only)', () => {
      const fields: AsCodeRuntimeField[] = [{ type: 'keyword', name: 'my_field' }];
      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields({
        runtime_fields: fields,
      });
      const { runtime_fields: runtimeFields = [] } = fromStoredFields(
        runtimeFieldMap,
        fieldFormats,
        fieldAttrs
      );
      expect(runtimeFields).toEqual(fields);
    });

    it('preserves a field with a script', () => {
      const fields: AsCodeRuntimeField[] = [
        { type: 'keyword', name: 'my_field', script: 'emit("hello")' },
      ];
      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields({
        runtime_fields: fields,
      });
      const { runtime_fields: runtimeFields = [] } = fromStoredFields(
        runtimeFieldMap,
        fieldFormats,
        fieldAttrs
      );
      expect(runtimeFields).toEqual(fields);
    });

    it('preserves a field with a format', () => {
      const fields: AsCodeRuntimeField[] = [
        {
          type: 'date',
          name: 'my_field',
          format: { type: 'date', params: { pattern: 'MM/DD/YYYY' } },
        },
      ];
      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields({
        runtime_fields: fields,
      });
      const { runtime_fields: runtimeFields = [] } = fromStoredFields(
        runtimeFieldMap,
        fieldFormats,
        fieldAttrs
      );
      expect(runtimeFields).toEqual(fields);
    });

    it('preserves a field with custom_label and custom_description', () => {
      const fields: AsCodeRuntimeField[] = [
        {
          type: 'keyword',
          name: 'my_field',
          custom_label: 'My Label',
          custom_description: 'A description',
        },
      ];
      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields({
        runtime_fields: fields,
      });
      const { runtime_fields: runtimeFields = [] } = fromStoredFields(
        runtimeFieldMap,
        fieldFormats,
        fieldAttrs
      );
      expect(runtimeFields).toEqual(fields);
    });

    it('preserves a field with all optional attrs set', () => {
      const fields: AsCodeRuntimeField[] = [
        {
          type: 'date',
          name: 'my_field',
          script: 'emit(doc["ts"].value)',
          format: { type: 'date', params: { pattern: 'MM/DD/YYYY' } },
          custom_label: 'Timestamp',
          custom_description: 'Event timestamp',
        },
      ];
      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields({
        runtime_fields: fields,
      });
      const { runtime_fields: runtimeFields = [] } = fromStoredFields(
        runtimeFieldMap,
        fieldFormats,
        fieldAttrs
      );
      expect(runtimeFields).toEqual(fields);
    });
  });

  describe('composite fields', () => {
    it('preserves a minimal composite field with no subfields', () => {
      const fields: AsCodeRuntimeField[] = [
        { type: RUNTIME_FIELD_COMPOSITE_TYPE, name: 'my_composite', fields: [] },
      ];
      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields({
        runtime_fields: fields,
      });
      const { runtime_fields: runtimeFields = [] } = fromStoredFields(
        runtimeFieldMap,
        fieldFormats,
        fieldAttrs
      );
      expect(runtimeFields).toEqual(fields);
    });

    it('preserves subfield type and name', () => {
      const fields: AsCodeRuntimeField[] = [
        {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          name: 'my_composite',
          fields: [
            { name: 'first', type: 'keyword' },
            { name: 'last', type: 'keyword' },
          ],
        },
      ];
      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields({
        runtime_fields: fields,
      });
      const { runtime_fields: runtimeFields = [] } = fromStoredFields(
        runtimeFieldMap,
        fieldFormats,
        fieldAttrs
      );
      expect(runtimeFields).toEqual(fields);
    });

    it('preserves script on the composite parent', () => {
      const fields: AsCodeRuntimeField[] = [
        {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          name: 'my_composite',
          script: 'emit("a", "b")',
          fields: [{ name: 'part', type: 'keyword' }],
        },
      ];
      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields({
        runtime_fields: fields,
      });
      const { runtime_fields: runtimeFields = [] } = fromStoredFields(
        runtimeFieldMap,
        fieldFormats,
        fieldAttrs
      );
      expect(runtimeFields).toEqual(fields);
    });

    it('preserves custom_label and custom_description on subfields', () => {
      const fields: AsCodeRuntimeField[] = [
        {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          name: 'my_composite',
          fields: [
            {
              name: 'sub',
              type: 'keyword',
              custom_label: 'Sub Label',
              custom_description: 'Sub description',
            },
          ],
        },
      ];
      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields({
        runtime_fields: fields,
      });
      const { runtime_fields: runtimeFields = [] } = fromStoredFields(
        runtimeFieldMap,
        fieldFormats,
        fieldAttrs
      );
      expect(runtimeFields).toEqual(fields);
    });

    it('preserves format on subfields', () => {
      const fields: AsCodeRuntimeField[] = [
        {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          name: 'my_composite',
          fields: [
            {
              name: 'sub',
              type: 'date',
              format: { type: 'date', params: { pattern: 'MM/DD/YYYY' } },
            },
          ],
        },
      ];
      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields({
        runtime_fields: fields,
      });
      const { runtime_fields: runtimeFields = [] } = fromStoredFields(
        runtimeFieldMap,
        fieldFormats,
        fieldAttrs
      );
      expect(runtimeFields).toEqual(fields);
    });

    it('preserves all attrs on a fully-populated composite field', () => {
      const fields: AsCodeRuntimeField[] = [
        {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          name: 'event',
          script: 'emit("x", "y")',
          fields: [
            {
              name: 'timestamp',
              type: 'date',
              format: { type: 'date', params: { pattern: 'MM/DD/YYYY' } },
              custom_label: 'Event Time',
              custom_description: 'When the event occurred',
            },
            {
              name: 'category',
              type: 'keyword',
              custom_label: 'Category',
              custom_description: 'Event category',
            },
          ],
        },
      ];
      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields({
        runtime_fields: fields,
      });
      const { runtime_fields: runtimeFields = [] } = fromStoredFields(
        runtimeFieldMap,
        fieldFormats,
        fieldAttrs
      );
      expect(runtimeFields).toEqual(fields);
    });
  });

  describe('multiple mixed fields', () => {
    it('preserves all fields across a set of primitives and composites', () => {
      const fields: AsCodeRuntimeField[] = [
        { type: 'keyword', name: 'prim_a', custom_label: 'Prim A' },
        { type: 'long', name: 'prim_b', script: 'emit(42)' },
        {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          name: 'comp',
          fields: [
            { name: 'sub_x', type: 'keyword', custom_label: 'X' },
            { name: 'sub_y', type: 'date' },
          ],
        },
      ];
      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields({
        runtime_fields: fields,
      });
      const { runtime_fields: runtimeFields = [] } = fromStoredFields(
        runtimeFieldMap,
        fieldFormats,
        fieldAttrs
      );
      expect(runtimeFields).toEqual(fields);
    });
  });

  describe('field settings', () => {
    it('preserves indexed field settings without runtime_fields', () => {
      const fields: Pick<AsCodeDataViewSpec, 'runtime_fields' | 'field_settings'> = {
        field_settings: {
          mapped: {
            custom_label: 'Mapped label',
            custom_description: 'Mapped description',
            format: { type: 'bytes', params: { pattern: '0,0.[000]b' } },
          },
        },
      };

      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields(fields);
      expect(fromStoredFields(runtimeFieldMap, fieldFormats, fieldAttrs)).toEqual(fields);
    });

    it('preserves field settings alongside runtime_fields', () => {
      const fields: Pick<AsCodeDataViewSpec, 'runtime_fields' | 'field_settings'> = {
        runtime_fields: [{ type: 'keyword', name: 'rt', custom_label: 'Runtime' }],
        field_settings: {
          mapped: {
            custom_label: 'Mapped label',
            format: { type: 'bytes', params: { pattern: '0,0.[000]b' } },
          },
        },
      };

      const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStoredFromAsCodeFields(fields);
      expect(fromStoredFields(runtimeFieldMap, fieldFormats, fieldAttrs)).toEqual(fields);
    });
  });
});

describe('roundtrip: stored → AsCode → stored', () => {
  describe('primitive fields', () => {
    it('preserves runtimeFieldMap for a basic field', () => {
      const runtimeFieldMap = { my_field: { type: 'keyword' as const } };
      const { runtimeFieldMap: result } = toStoredFromAsCodeFields(
        fromStoredFields(runtimeFieldMap, {}, {})
      );
      expect(result).toEqual(runtimeFieldMap);
    });

    it('preserves runtimeFieldMap for a field with a script', () => {
      const runtimeFieldMap = {
        my_field: { type: 'keyword' as const, script: { source: 'emit("x")' } },
      };
      const { runtimeFieldMap: result } = toStoredFromAsCodeFields(
        fromStoredFields(runtimeFieldMap, {}, {})
      );
      expect(result).toEqual(runtimeFieldMap);
    });

    it('preserves fieldFormats for a field with a format', () => {
      const runtimeFieldMap = { my_field: { type: 'date' as const } };
      const fieldFormats = { my_field: { id: 'date', params: { pattern: 'MM/DD/YYYY' } } };
      const { fieldFormats: result } = toStoredFromAsCodeFields(
        fromStoredFields(runtimeFieldMap, fieldFormats, {})
      );
      expect(result).toEqual(fieldFormats);
    });

    it('preserves fieldAttrs for a field with custom_label and custom_description', () => {
      const runtimeFieldMap = { my_field: { type: 'keyword' as const } };
      const fieldAttrs = {
        my_field: { customLabel: 'My Field', customDescription: 'A description' },
      };
      const { fieldAttrs: result } = toStoredFromAsCodeFields(
        fromStoredFields(runtimeFieldMap, {}, fieldAttrs)
      );
      expect(result).toEqual(fieldAttrs);
    });

    it('preserves all stored structures for a fully-populated field', () => {
      const runtimeFieldMap = {
        my_field: { type: 'date' as const, script: { source: 'emit(doc["ts"].value)' } },
      };
      const fieldFormats = { my_field: { id: 'date', params: { pattern: 'MM/DD/YYYY' } } };
      const fieldAttrs = {
        my_field: { customLabel: 'Timestamp', customDescription: 'When it happened' },
      };

      const {
        runtimeFieldMap: rm,
        fieldFormats: ff,
        fieldAttrs: fa,
      } = toStoredFromAsCodeFields(fromStoredFields(runtimeFieldMap, fieldFormats, fieldAttrs));

      expect(rm).toEqual(runtimeFieldMap);
      expect(ff).toEqual(fieldFormats);
      expect(fa).toEqual(fieldAttrs);
    });
  });

  describe('composite fields', () => {
    it('preserves runtimeFieldMap for a composite field with subfields', () => {
      const runtimeFieldMap = {
        my_composite: {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          fields: {
            sub_a: { type: 'keyword' as const },
            sub_b: { type: 'long' as const },
          },
        },
      };
      const { runtimeFieldMap: result } = toStoredFromAsCodeFields(
        fromStoredFields(runtimeFieldMap, {}, {})
      );
      expect(result).toEqual(runtimeFieldMap);
    });

    it('preserves runtimeFieldMap for a composite field with a script', () => {
      const runtimeFieldMap = {
        my_composite: {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          script: { source: 'emit("a", "b")' },
          fields: { sub: { type: 'keyword' as const } },
        },
      };
      const { runtimeFieldMap: result } = toStoredFromAsCodeFields(
        fromStoredFields(runtimeFieldMap, {}, {})
      );
      expect(result).toEqual(runtimeFieldMap);
    });

    it('preserves fieldFormats for composite subfields', () => {
      const runtimeFieldMap = {
        my_composite: {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          fields: { sub: { type: 'date' as const } },
        },
      };
      const fieldFormats = {
        'my_composite.sub': { id: 'date', params: { pattern: 'MM/DD/YYYY' } },
      };
      const { fieldFormats: result } = toStoredFromAsCodeFields(
        fromStoredFields(runtimeFieldMap, fieldFormats, {})
      );
      expect(result).toEqual(fieldFormats);
    });

    it('preserves fieldAttrs for composite subfields', () => {
      const runtimeFieldMap = {
        my_composite: {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          fields: {
            sub_a: { type: 'keyword' as const },
            sub_b: { type: 'keyword' as const },
          },
        },
      };
      const fieldAttrs = {
        'my_composite.sub_a': { customLabel: 'Sub A' },
        'my_composite.sub_b': { customLabel: 'Sub B', customDescription: 'Second subfield' },
      };
      const { fieldAttrs: result } = toStoredFromAsCodeFields(
        fromStoredFields(runtimeFieldMap, {}, fieldAttrs)
      );
      expect(result).toEqual(fieldAttrs);
    });

    it('preserves all stored structures for a fully-populated composite field', () => {
      const runtimeFieldMap = {
        event: {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          script: { source: 'emit("a", "b")' },
          fields: {
            timestamp: { type: 'date' as const },
            category: { type: 'keyword' as const },
          },
        },
      };
      const fieldFormats = {
        'event.timestamp': { id: 'date', params: { pattern: 'MM/DD/YYYY' } },
      };
      const fieldAttrs = {
        'event.timestamp': { customLabel: 'Event Time' },
        'event.category': { customLabel: 'Category', customDescription: 'Event category' },
      };

      const {
        runtimeFieldMap: rm,
        fieldFormats: ff,
        fieldAttrs: fa,
      } = toStoredFromAsCodeFields(fromStoredFields(runtimeFieldMap, fieldFormats, fieldAttrs));

      expect(rm).toEqual(runtimeFieldMap);
      expect(ff).toEqual(fieldFormats);
      expect(fa).toEqual(fieldAttrs);
    });
  });

  describe('multiple mixed fields', () => {
    it('preserves all stored structures across a set of primitives and composites', () => {
      const runtimeFieldMap = {
        prim: { type: 'long' as const, script: { source: 'emit(42)' } },
        comp: {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          fields: {
            sub_x: { type: 'keyword' as const },
            sub_y: { type: 'date' as const },
          },
        },
      };
      const fieldFormats = {
        prim: { id: 'number', params: { decimals: 2 } },
        'comp.sub_y': { id: 'date', params: { pattern: 'MM/DD/YYYY' } },
      };
      const fieldAttrs = {
        prim: { customLabel: 'Prim' },
        'comp.sub_x': { customLabel: 'X' },
        'comp.sub_y': { customDescription: 'Y description' },
      };

      const {
        runtimeFieldMap: rm,
        fieldFormats: ff,
        fieldAttrs: fa,
      } = toStoredFromAsCodeFields(fromStoredFields(runtimeFieldMap, fieldFormats, fieldAttrs));

      expect(rm).toEqual(runtimeFieldMap);
      expect(ff).toEqual(fieldFormats);
      expect(fa).toEqual(fieldAttrs);
    });
  });

  describe('indexed field settings', () => {
    it('preserves non-runtime fieldFormats and fieldAttrs through AsCode roundtrip', () => {
      const runtimeFieldMap = { rt: { type: 'keyword' as const } };
      const fieldFormats = { rt: { id: 'string' }, mapped: { id: 'bytes' } };
      const fieldAttrs = {
        rt: { customLabel: 'Runtime' },
        mapped: { customLabel: 'Mapped', customDescription: 'Mapped description' },
      };

      const {
        runtimeFieldMap: rm,
        fieldFormats: ff,
        fieldAttrs: fa,
      } = toStoredFromAsCodeFields(fromStoredFields(runtimeFieldMap, fieldFormats, fieldAttrs));

      expect(rm).toEqual(runtimeFieldMap);
      expect(ff).toEqual(fieldFormats);
      expect(fa).toEqual(fieldAttrs);
    });
  });
});
