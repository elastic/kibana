/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldFormat } from '@kbn/field-formats-plugin/common';

import { RuntimeField, RuntimePrimitiveTypes, FieldSpec, DataViewSpec } from '../types';
import { stubLogstashFields } from '../field.stub';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { CharacterNotAllowedInField } from '@kbn/kibana-utils-plugin/common';
import { last, map } from 'lodash';
import { stubbedSavedObjectIndexPattern } from '../data_view.stub';
import { DataViewField } from '../fields';
import { DataViewLazy } from './data_view_lazy';
import { stubLogstashFieldSpecMap } from '../field.stub';

class MockFieldFormatter {}

let fieldCapsResponse: FieldSpec[];

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
  esTypes: ['keyword'],
  type: 'string',
};

// helper function to create index patterns
function create(id: string, spec?: DataViewSpec) {
  const {
    type,
    version,
    attributes: { timeFieldName, fields, title, name },
  } = stubbedSavedObjectIndexPattern(id);

  return new DataViewLazy({
    spec: {
      id,
      type,
      version,
      timeFieldName,
      fields: { ...JSON.parse(fields), runtime_field: runtimeField },
      title,
      name,
      runtimeFieldMap,
      ...spec,
    },
    fieldFormats: fieldFormatsMock,
    shortDotsEnable: false,
    metaFields: [],
    apiClient: {
      getFieldsForWildcard: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ fields: fieldCapsResponse })),
      // jest.fn().mockResolvedValue({ fields: fieldCapsResponse }),
    } as any,
  });
}

/**
 * To test
 * create data view, check a number of attributes
 */

describe('DataViewLazy', () => {
  let dataViewLazy: DataViewLazy;

  // create an indexPattern instance for each test
  beforeEach(() => {
    dataViewLazy = create('test-pattern');
    // strip out scripted fields as they're not returned by field caps
    fieldCapsResponse = Object.values(stubLogstashFieldSpecMap).filter((fld) => !fld.scripted);
  });

  describe('api', () => {
    test('should have expected properties', () => {
      expect(dataViewLazy).toHaveProperty('getScriptedFields');
      /*
      expect(indexPattern).toHaveProperty('getNonScriptedFields');
      expect(indexPattern).toHaveProperty('removeScriptedField');
      expect(indexPattern).toHaveProperty('addRuntimeField');
      expect(indexPattern).toHaveProperty('removeRuntimeField');
      */
    });
  });

  describe('fields', () => {
    test('should have expected properties on fields', async function () {
      const [field] = await dataViewLazy.getFields({ fieldName: ['bytes'] });
      expect(field).toHaveProperty('displayName');
      expect(field).toHaveProperty('filterable');
      expect(field).toHaveProperty('sortable');
      expect(field).toHaveProperty('scripted');
      expect(field).toHaveProperty('isMapped');
    });
  });

  /* isTSDBMode - not yet implemented, needs to get all number fields
  describe('isTSDBMode', () => {
    const tsdbField: FieldSpec = {
      name: 'tsdb-metric-field',
      type: 'number',
      aggregatable: true,
      searchable: true,
      timeSeriesMetric: 'gauge',
    };

    test('should return false if no fields are tsdb fields', () => {
      expect(indexPattern.isTSDBMode()).toBe(false);
    });

    test('should return true if some fields are tsdb fields', () => {
      indexPattern.fields.add(tsdbField);
      expect(indexPattern.isTSDBMode()).toBe(true);
    });

    afterAll(() => {
      indexPattern.fields.remove(tsdbField);
    });
  });
  */

  describe('getScriptedFields', () => {
    test('should return all scripted fields', () => {
      const scriptedNames = stubLogstashFields
        .filter((item: DataViewField) => item.scripted === true)
        .map((item: DataViewField) => item.name);
      const respNames = map(dataViewLazy.getScriptedFields(), 'name');

      expect(respNames).toEqual(scriptedNames);
    });
  });

  describe('getComputedFields', () => {
    test('should be a function', () => {
      expect(dataViewLazy.getComputedFields).toBeInstanceOf(Function);
    });

    test('should request date fields as docvalue_fields', async () => {
      fieldCapsResponse = Object.values(stubLogstashFieldSpecMap).filter(
        (field) => field.type === 'date' && !field.scripted
      );
      const { docvalueFields } = await dataViewLazy.getComputedFields({ fieldNames: ['*'] });
      const docValueFieldNames = docvalueFields.map((field) => field.field);

      expect(Object.keys(docValueFieldNames).length).toBe(3);
      expect(docValueFieldNames).toContain('@timestamp');
      expect(docValueFieldNames).toContain('time');
      expect(docValueFieldNames).toContain('utc_time');
    });

    test('should return runtimeField', async () => {
      expect((await dataViewLazy.getComputedFields({ fieldNames: ['*'] })).runtimeFields).toEqual({
        runtime_field: runtimeFieldScript,
      });
    });

    test('should request date field doc values in date_time format', async () => {
      const { docvalueFields } = await dataViewLazy.getComputedFields({ fieldNames: ['*'] });
      const timestampField = docvalueFields.find((field) => field.field === '@timestamp');

      expect(timestampField).toHaveProperty('format', 'date_time');
    });

    test('should not request scripted date fields as docvalue_fields', async () => {
      const { docvalueFields } = await dataViewLazy.getComputedFields({ fieldNames: ['*'] });

      expect(docvalueFields).not.toContain('script date');
    });
  });

  describe('getNonScriptedFields', () => {
    test('should return all non-scripted fields', async () => {
      fieldCapsResponse = Object.values(stubLogstashFieldSpecMap).filter(
        (field) => !field.scripted
      );
      const notScriptedNames = stubLogstashFields
        .filter((item: DataViewField) => item.scripted === false)
        .map((item: DataViewField) => item.name);
      notScriptedNames.push('runtime_field');

      const respNames = map(
        await dataViewLazy.getFields({ fieldName: ['*'], scripted: false }),
        'name'
      );

      expect(respNames).toEqual(notScriptedNames);
    });
  });

  describe('add and remove scripted fields', () => {
    test('should append the scripted field', async () => {
      // keep a copy of the current scripted field count
      const oldCount = dataViewLazy.getScriptedFields().length;

      // add a new scripted field
      const scriptedField = {
        name: 'new scripted field',
        script: 'false',
        type: 'boolean',
      };

      /* add scripted field
      dataViewLazy.fields.add({
        name: scriptedField.name,
        script: scriptedField.script,
        type: scriptedField.type,
        scripted: true,
        lang: 'painless',
        aggregatable: true,
        searchable: true,
        count: 0,
        readFromDocValues: false,
      });
      */

      dataViewLazy.upsertScriptedField({
        name: scriptedField.name,
        script: scriptedField.script,
        type: scriptedField.type,
        scripted: true,
        lang: 'painless',
        aggregatable: true,
        searchable: true,
        // count: 0,
        // readFromDocValues: false,
      });

      const scriptedFields = dataViewLazy.getScriptedFields();
      expect(scriptedFields).toHaveLength(oldCount + 1);

      expect((await dataViewLazy.getFieldByName(scriptedField.name))?.name).toEqual(
        scriptedField.name
      );
    });

    test('should remove scripted field, by name', async () => {
      const scriptedFields = dataViewLazy.getScriptedFields();
      const oldCount = scriptedFields.length;
      const scriptedField = last(scriptedFields)!;

      await dataViewLazy.removeScriptedField(scriptedField.name);

      expect(dataViewLazy.getScriptedFields().length).toEqual(oldCount - 1);
      expect(await dataViewLazy.getFieldByName(scriptedField.name)).toEqual(undefined);
    });
  });

  describe('setFieldFormat and deleteFieldFormaat', () => {
    test('should persist changes', async () => {
      const formatter = {
        toJSON: () => ({ id: 'bytes' }),
      } as FieldFormat;
      dataViewLazy.getFormatterForField = () => formatter;
      dataViewLazy.setFieldFormat('bytes', { id: 'bytes' });
      expect((await dataViewLazy.toSpec()).fieldFormats).toEqual({ bytes: { id: 'bytes' } });

      dataViewLazy.deleteFieldFormat('bytes');
      expect((await dataViewLazy.toSpec()).fieldFormats).toEqual({});
    });
  });

  describe('addRuntimeField and removeRuntimeField', () => {
    const runtime = {
      type: 'keyword' as RuntimeField['type'],
      script: {
        source: "emit('hello world');",
      },
    };

    const runtimeWithAttrs = {
      ...runtime,
      popularity: 5,
      customLabel: 'custom name',
      format: {
        id: 'bytes',
      },
    };

    const runtimeComposite = {
      type: 'composite' as RuntimeField['type'],
      script: {
        source: "emit('hello world');",
      },
      fields: {
        a: {
          type: 'keyword' as RuntimePrimitiveTypes,
        },
        b: {
          type: 'long' as RuntimePrimitiveTypes,
        },
      },
    };

    const runtimeCompositeWithAttrs = {
      type: runtimeComposite.type,
      script: runtimeComposite.script,
      fields: {
        a: {
          ...runtimeComposite.fields.a,
          popularity: 3,
          customLabel: 'custom name a',
          format: {
            id: 'bytes',
          },
        },
        b: {
          ...runtimeComposite.fields.b,
          popularity: 4,
          customLabel: 'custom name b',
          format: {
            id: 'bytes',
          },
        },
      },
    };

    beforeEach(() => {
      const formatter = {
        toJSON: () => ({ id: 'bytes' }),
      } as FieldFormat;
      dataViewLazy.getFormatterForField = () => formatter;
      dataViewLazy.getFormatterForFieldNoDefault = () => undefined;
    });

    test('add and remove runtime field to existing field', async () => {
      await dataViewLazy.addRuntimeField('@tags', runtimeWithAttrs);
      expect((await dataViewLazy.toSpec()).runtimeFieldMap).toEqual({
        '@tags': runtime,
        runtime_field: runtimeField.runtimeField,
      });
      const field = (await dataViewLazy.toSpec())!.fields!['@tags'];
      console.log('****', (await dataViewLazy.toSpec())!.fields);
      expect(field.runtimeField).toEqual(runtime);
      expect(field.count).toEqual(5);
      /* todo add formatters
      expect(field.format).toEqual({
        id: 'bytes',
      });
      */
      expect(field.customLabel).toEqual('custom name');
      expect((await dataViewLazy.toSpec()).fieldAttrs!['@tags']).toEqual({
        customLabel: 'custom name',
        count: 5,
      });

      dataViewLazy.removeRuntimeField('@tags');
      expect((await dataViewLazy.toSpec()).runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
      });
      expect((await dataViewLazy.toSpec())!.fields!['@tags'].runtimeField).toBeUndefined();
    });

    /*
    todo - mapped fields need to override runtime fields
    test('ignore runtime field mapping if a mapped field exists with the same name', () => {
      expect(dataViewLazy.getRuntimeMappings()).toEqual({
        runtime_field: { script: { source: "emit('hello world')" }, type: 'keyword' },
      });

      // add a runtime field called "theme"
      dataViewLazy.addRuntimeField('theme', runtimeWithAttrs);

      // add a new mapped field also called "theme"
      const themeFieldSpec = {
        name: 'theme',
        type: 'keyword',
        aggregatable: true,
        searchable: true,
        readFromDocValues: false,
        isMapped: true,
      };

      fieldCapsResponse = [...fieldCapsResponse, themeFieldSpec];

      expect(dataViewLazy.getRuntimeMappings()).toEqual({
        runtime_field: { script: { source: "emit('hello world')" }, type: 'keyword' },
      });
    });
    */

    test('add and remove runtime field as new field', async () => {
      dataViewLazy.addRuntimeField('new_field', runtimeWithAttrs);
      expect((await dataViewLazy.toSpec()).runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
        new_field: runtime,
      });
      expect(dataViewLazy.getRuntimeField('new_field')).toMatchSnapshot();
      expect((await dataViewLazy.toSpec())!.fields!.new_field.runtimeField).toEqual(runtime);

      dataViewLazy.removeRuntimeField('new_field');
      expect((await dataViewLazy.toSpec()).runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
      });
      expect((await dataViewLazy.toSpec())!.fields!.new_field).toBeUndefined();
    });

    test('add and remove a custom label from a runtime field', async () => {
      const newField = 'new_field_test';
      dataViewLazy.addRuntimeField(newField, {
        ...runtimeWithAttrs,
        customLabel: 'test1',
      });
      expect((await dataViewLazy.getFieldByName(newField))?.customLabel).toEqual('test1');
      dataViewLazy.setFieldCustomLabel(newField, 'test2');
      expect((await dataViewLazy.getFieldByName(newField))?.customLabel).toEqual('test2');
      dataViewLazy.setFieldCustomLabel(newField, undefined);
      expect((await dataViewLazy.getFieldByName(newField))?.customLabel).toBeUndefined();
      dataViewLazy.removeRuntimeField(newField);
    });
    /*
    test('add and remove composite runtime field as new fields', async () => {
      const fieldCount = (await dataViewLazy.getFields({})).length;
      dataViewLazy.addRuntimeField('new_field', runtimeCompositeWithAttrs);
      expect((await dataViewLazy.toSpec()).runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
        new_field: runtimeComposite,
      });
      expect((await dataViewLazy.getFields({})).length - fieldCount).toEqual(2);
      expect(dataViewLazy.getRuntimeField('new_field')).toMatchSnapshot();
      expect((await dataViewLazy.toSpec())!.fields!['new_field.a']).toBeDefined();
      expect((await dataViewLazy.toSpec())!.fields!['new_field.b']).toBeDefined();
      expect((await dataViewLazy.toSpec()).fieldAttrs!['new_field.a']).toEqual({
        count: 3,
        customLabel: 'custom name a',
      });
      expect((await dataViewLazy.toSpec()).fieldAttrs!['new_field.b']).toEqual({
        count: 4,
        customLabel: 'custom name b',
      });

      dataViewLazy.removeRuntimeField('new_field');
      expect((await dataViewLazy.toSpec()).runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
      });
      expect((await dataViewLazy.toSpec())!.fields!.new_field).toBeUndefined();
    });

    */
    test('should not allow runtime field with * in name', async () => {
      try {
        await dataViewLazy.addRuntimeField('test*123', runtime);
      } catch (e) {
        expect(e).toBeInstanceOf(CharacterNotAllowedInField);
      }
    });
  });
});
