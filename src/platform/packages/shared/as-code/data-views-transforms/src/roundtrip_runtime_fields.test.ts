/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { RUNTIME_FIELD_COMPOSITE_TYPE } from '@kbn/data-views-plugin/common';
import type { AsCodeRuntimeField } from '@kbn/as-code-data-views-schema';
import {
  toStoredRuntimeFields,
  toStoredFieldFormats,
  toStoredFieldAttributes,
} from './to_stored_runtime_fields';
import { fromStoredRuntimeFields } from './from_stored_runtime_fields';

const toStored = (fields: AsCodeRuntimeField[]) => ({
  runtimeFieldMap: toStoredRuntimeFields(fields),
  fieldFormats: toStoredFieldFormats(fields),
  fieldAttrs: toStoredFieldAttributes(fields),
});

const roundtripFromAsCode = (fields: AsCodeRuntimeField[]): AsCodeRuntimeField[] => {
  const { runtimeFieldMap, fieldFormats, fieldAttrs } = toStored(fields);
  return fromStoredRuntimeFields(runtimeFieldMap, fieldFormats, fieldAttrs);
};

const roundtripFromStored = (
  runtimeFieldMap: Parameters<typeof fromStoredRuntimeFields>[0],
  fieldFormats: Parameters<typeof fromStoredRuntimeFields>[1],
  fieldAttrs: Parameters<typeof fromStoredRuntimeFields>[2]
) => {
  const fields = fromStoredRuntimeFields(runtimeFieldMap, fieldFormats, fieldAttrs);
  return toStored(fields);
};

describe('roundtrip: AsCode → stored → AsCode', () => {
  describe('primitive fields', () => {
    it('preserves a minimal field (type + name only)', () => {
      const fields: AsCodeRuntimeField[] = [{ type: 'keyword', name: 'my_field' }];
      expect(roundtripFromAsCode(fields)).toEqual(fields);
    });

    it('preserves a field with a script', () => {
      const fields: AsCodeRuntimeField[] = [
        { type: 'keyword', name: 'my_field', script: 'emit("hello")' },
      ];
      expect(roundtripFromAsCode(fields)).toEqual(fields);
    });

    it('preserves a field with a format', () => {
      const fields: AsCodeRuntimeField[] = [
        {
          type: 'date',
          name: 'my_field',
          format: { type: 'date', params: { pattern: 'MM/DD/YYYY' } },
        },
      ];
      expect(roundtripFromAsCode(fields)).toEqual(fields);
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
      expect(roundtripFromAsCode(fields)).toEqual(fields);
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
      expect(roundtripFromAsCode(fields)).toEqual(fields);
    });
  });

  describe('composite fields', () => {
    it('preserves a minimal composite field with no subfields', () => {
      const fields: AsCodeRuntimeField[] = [
        { type: RUNTIME_FIELD_COMPOSITE_TYPE, name: 'my_composite', fields: [] },
      ];
      expect(roundtripFromAsCode(fields)).toEqual(fields);
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
      expect(roundtripFromAsCode(fields)).toEqual(fields);
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
      expect(roundtripFromAsCode(fields)).toEqual(fields);
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
      expect(roundtripFromAsCode(fields)).toEqual(fields);
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
      expect(roundtripFromAsCode(fields)).toEqual(fields);
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
      expect(roundtripFromAsCode(fields)).toEqual(fields);
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
      expect(roundtripFromAsCode(fields)).toEqual(fields);
    });
  });
});

describe('roundtrip: stored → AsCode → stored', () => {
  describe('primitive fields', () => {
    it('preserves runtimeFieldMap for a basic field', () => {
      const runtimeFieldMap = { my_field: { type: 'keyword' as const } };
      const { runtimeFieldMap: result } = roundtripFromStored(runtimeFieldMap, {}, {});
      expect(result).toEqual(runtimeFieldMap);
    });

    it('preserves runtimeFieldMap for a field with a script', () => {
      const runtimeFieldMap = {
        my_field: { type: 'keyword' as const, script: { source: 'emit("x")' } },
      };
      const { runtimeFieldMap: result } = roundtripFromStored(runtimeFieldMap, {}, {});
      expect(result).toEqual(runtimeFieldMap);
    });

    it('preserves fieldFormats for a field with a format', () => {
      const runtimeFieldMap = { my_field: { type: 'date' as const } };
      const fieldFormats = { my_field: { id: 'date', params: { pattern: 'MM/DD/YYYY' } } };
      const { fieldFormats: result } = roundtripFromStored(runtimeFieldMap, fieldFormats, {});
      expect(result).toEqual(fieldFormats);
    });

    it('preserves fieldAttrs for a field with custom_label and custom_description', () => {
      const runtimeFieldMap = { my_field: { type: 'keyword' as const } };
      const fieldAttrs = {
        my_field: { customLabel: 'My Field', customDescription: 'A description' },
      };
      const { fieldAttrs: result } = roundtripFromStored(runtimeFieldMap, {}, fieldAttrs);
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
      } = roundtripFromStored(runtimeFieldMap, fieldFormats, fieldAttrs);

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
      const { runtimeFieldMap: result } = roundtripFromStored(runtimeFieldMap, {}, {});
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
      const { runtimeFieldMap: result } = roundtripFromStored(runtimeFieldMap, {}, {});
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
      const { fieldFormats: result } = roundtripFromStored(runtimeFieldMap, fieldFormats, {});
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
      const { fieldAttrs: result } = roundtripFromStored(runtimeFieldMap, {}, fieldAttrs);
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
      } = roundtripFromStored(runtimeFieldMap, fieldFormats, fieldAttrs);

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
      } = roundtripFromStored(runtimeFieldMap, fieldFormats, fieldAttrs);

      expect(rm).toEqual(runtimeFieldMap);
      expect(ff).toEqual(fieldFormats);
      expect(fa).toEqual(fieldAttrs);
    });
  });
});
