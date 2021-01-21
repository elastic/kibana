/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { map, last } from 'lodash';

import { IndexPattern } from './index_pattern';

import { DuplicateField } from '../../../../kibana_utils/common';
// @ts-expect-error
import mockLogStashFields from './fixtures/logstash_fields';
import { stubbedSavedObjectIndexPattern } from './fixtures/stubbed_saved_object_index_pattern';
import { IndexPatternField } from '../fields';

import { fieldFormatsMock } from '../../field_formats/mocks';
import { FieldFormat } from '../..';
import { RuntimeField } from '../types';

class MockFieldFormatter {}

const runtimeFieldScript = {
  type: 'keyword' as RuntimeField['type'],
  script: {
    source: "emit('hello world')",
  },
};

const runtimeFieldMap = {
  runtime_field: runtimeFieldScript,
};

const runtimeField = {
  name: 'runtime_field',
  runtimeField: runtimeFieldScript,
  scripted: false,
};

fieldFormatsMock.getInstance = jest.fn().mockImplementation(() => new MockFieldFormatter()) as any;

// helper function to create index patterns
function create(id: string) {
  const {
    type,
    version,
    attributes: { timeFieldName, fields, title },
  } = stubbedSavedObjectIndexPattern(id);

  return new IndexPattern({
    spec: {
      id,
      type,
      version,
      timeFieldName,
      fields: { ...fields, runtime_field: runtimeField },
      title,
      runtimeFieldMap,
    },
    fieldFormats: fieldFormatsMock,
    shortDotsEnable: false,
    metaFields: [],
  });
}

describe('IndexPattern', () => {
  let indexPattern: IndexPattern;

  // create an indexPattern instance for each test
  beforeEach(() => {
    indexPattern = create('test-pattern');
  });

  describe('api', () => {
    test('should have expected properties', () => {
      expect(indexPattern).toHaveProperty('getScriptedFields');
      expect(indexPattern).toHaveProperty('getNonScriptedFields');
      expect(indexPattern).toHaveProperty('addScriptedField');
      expect(indexPattern).toHaveProperty('removeScriptedField');
      expect(indexPattern).toHaveProperty('addScriptedField');
      expect(indexPattern).toHaveProperty('removeScriptedField');
      expect(indexPattern).toHaveProperty('addRuntimeField');
      expect(indexPattern).toHaveProperty('removeRuntimeField');

      // properties
      expect(indexPattern).toHaveProperty('fields');
    });
  });

  describe('fields', () => {
    test('should have expected properties on fields', function () {
      expect(indexPattern.fields[0]).toHaveProperty('displayName');
      expect(indexPattern.fields[0]).toHaveProperty('filterable');
      expect(indexPattern.fields[0]).toHaveProperty('sortable');
      expect(indexPattern.fields[0]).toHaveProperty('scripted');
      expect(indexPattern.fields[0]).toHaveProperty('isMapped');
    });
  });

  describe('getScriptedFields', () => {
    test('should return all scripted fields', () => {
      const scriptedNames = mockLogStashFields()
        .filter((item: IndexPatternField) => item.scripted === true)
        .map((item: IndexPatternField) => item.name);
      const respNames = map(indexPattern.getScriptedFields(), 'name');

      expect(respNames).toEqual(scriptedNames);
    });
  });

  describe('getComputedFields', () => {
    test('should be a function', () => {
      expect(indexPattern.getComputedFields).toBeInstanceOf(Function);
    });

    test('should request all stored fields', () => {
      expect(indexPattern.getComputedFields().storedFields).toContain('*');
    });

    test('should request date fields as docvalue_fields', () => {
      const { docvalueFields } = indexPattern.getComputedFields();
      const docValueFieldNames = docvalueFields.map((field) => field.field);

      expect(Object.keys(docValueFieldNames).length).toBe(3);
      expect(docValueFieldNames).toContain('@timestamp');
      expect(docValueFieldNames).toContain('time');
      expect(docValueFieldNames).toContain('utc_time');
    });

    test('should return runtimeField', () => {
      expect(indexPattern.getComputedFields().runtimeFields).toEqual({
        runtime_field: runtimeFieldScript,
      });
    });

    test('should request date field doc values in date_time format', () => {
      const { docvalueFields } = indexPattern.getComputedFields();
      const timestampField = docvalueFields.find((field) => field.field === '@timestamp');

      expect(timestampField).toHaveProperty('format', 'date_time');
    });

    test('should not request scripted date fields as docvalue_fields', () => {
      const { docvalueFields } = indexPattern.getComputedFields();

      expect(docvalueFields).not.toContain('script date');
    });
  });

  describe('getNonScriptedFields', () => {
    test('should return all non-scripted fields', () => {
      const notScriptedNames = mockLogStashFields()
        .filter((item: IndexPatternField) => item.scripted === false)
        .map((item: IndexPatternField) => item.name);
      notScriptedNames.push('runtime_field');
      const respNames = map(indexPattern.getNonScriptedFields(), 'name');

      expect(respNames).toEqual(notScriptedNames);
    });
  });

  describe('add and remove scripted fields', () => {
    test('should append the scripted field', async () => {
      // keep a copy of the current scripted field count
      const oldCount = indexPattern.getScriptedFields().length;

      // add a new scripted field
      const scriptedField = {
        name: 'new scripted field',
        script: 'false',
        type: 'boolean',
      };

      await indexPattern.addScriptedField(
        scriptedField.name,
        scriptedField.script,
        scriptedField.type
      );

      const scriptedFields = indexPattern.getScriptedFields();
      expect(scriptedFields).toHaveLength(oldCount + 1);
      expect((indexPattern.fields.getByName(scriptedField.name) as IndexPatternField).name).toEqual(
        scriptedField.name
      );
    });

    test('should remove scripted field, by name', async () => {
      const scriptedFields = indexPattern.getScriptedFields();
      const oldCount = scriptedFields.length;
      const scriptedField = last(scriptedFields)!;

      await indexPattern.removeScriptedField(scriptedField.name);

      expect(indexPattern.getScriptedFields().length).toEqual(oldCount - 1);
      expect(indexPattern.fields.getByName(scriptedField.name)).toEqual(undefined);
    });

    test('should not allow duplicate names', async () => {
      const scriptedFields = indexPattern.getScriptedFields();
      const scriptedField = last(scriptedFields) as any;
      expect.assertions(1);
      try {
        await indexPattern.addScriptedField(scriptedField.name, "'new script'", 'string');
      } catch (e) {
        expect(e).toBeInstanceOf(DuplicateField);
      }
    });
  });

  describe('setFieldFormat and deleteFieldFormaat', () => {
    test('should persist changes', () => {
      const formatter = {
        toJSON: () => ({ id: 'bytes' }),
      } as FieldFormat;
      indexPattern.getFormatterForField = () => formatter;
      indexPattern.setFieldFormat('bytes', { id: 'bytes' });
      expect(indexPattern.toSpec().fieldFormats).toEqual({ bytes: { id: 'bytes' } });

      indexPattern.deleteFieldFormat('bytes');
      expect(indexPattern.toSpec().fieldFormats).toEqual({});
    });
  });

  describe('addRuntimeField and removeRuntimeField', () => {
    const runtime = {
      type: 'keyword' as RuntimeField['type'],
      script: {
        source: "emit('hello world');",
      },
    };

    beforeEach(() => {
      const formatter = {
        toJSON: () => ({ id: 'bytes' }),
      } as FieldFormat;
      indexPattern.getFormatterForField = () => formatter;
    });

    test('add and remove runtime field to existing field', () => {
      indexPattern.addRuntimeField('@tags', runtime);
      expect(indexPattern.toSpec().runtimeFieldMap).toEqual({
        '@tags': runtime,
        runtime_field: runtimeField.runtimeField,
      });
      expect(indexPattern.toSpec()!.fields!['@tags'].runtimeField).toEqual(runtime);

      indexPattern.removeRuntimeField('@tags');
      expect(indexPattern.toSpec().runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
      });
      expect(indexPattern.toSpec()!.fields!['@tags'].runtimeField).toBeUndefined();
    });

    test('add and remove runtime field as new field', () => {
      indexPattern.addRuntimeField('new_field', runtime);
      expect(indexPattern.toSpec().runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
        new_field: runtime,
      });
      expect(indexPattern.toSpec()!.fields!.new_field.runtimeField).toEqual(runtime);

      indexPattern.removeRuntimeField('new_field');
      expect(indexPattern.toSpec().runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
      });
      expect(indexPattern.toSpec()!.fields!.new_field).toBeUndefined();
    });
  });

  describe('getFormatterForField', () => {
    test('should return the default one for empty objects', () => {
      indexPattern.setFieldFormat('scriptedFieldWithEmptyFormatter', {});
      expect(
        indexPattern.getFormatterForField({
          name: 'scriptedFieldWithEmptyFormatter',
          type: 'number',
          esTypes: ['long'],
        })
      ).toEqual(
        expect.objectContaining({
          convert: expect.any(Function),
          getConverterFor: expect.any(Function),
        })
      );
    });
  });

  describe('toSpec', () => {
    test('should match snapshot', () => {
      const formatter = {
        toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }),
      } as FieldFormat;
      indexPattern.getFormatterForField = () => formatter;
      expect(indexPattern.toSpec()).toMatchSnapshot();
    });

    test('can restore from spec', async () => {
      const formatter = {
        toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }),
      } as FieldFormat;
      indexPattern.getFormatterForField = () => formatter;
      const spec = indexPattern.toSpec();
      const restoredPattern = new IndexPattern({
        spec,
        fieldFormats: fieldFormatsMock,
        shortDotsEnable: false,
        metaFields: [],
      });
      expect(restoredPattern.id).toEqual(indexPattern.id);
      expect(restoredPattern.title).toEqual(indexPattern.title);
      expect(restoredPattern.timeFieldName).toEqual(indexPattern.timeFieldName);
      expect(restoredPattern.fields.length).toEqual(indexPattern.fields.length);
    });
  });
});
