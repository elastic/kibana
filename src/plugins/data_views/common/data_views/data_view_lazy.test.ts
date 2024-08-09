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

const toSpecGetAllFields = {
  fieldParams: { fieldName: ['*'] },
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
    } as any,
    scriptedFieldsEnabled: true,
  });
}

/**
 * To test
 * create data view, check a number of attributes
 */

describe('DataViewLazy', () => {
  let dataViewLazy: DataViewLazy;

  // create an dataViewLazy instance for each test
  beforeEach(() => {
    dataViewLazy = create('test-pattern');
    // strip out scripted fields as they're not returned by field caps
    fieldCapsResponse = Object.values(stubLogstashFieldSpecMap).filter((fld) => !fld.scripted);
  });

  describe('api', () => {
    test('should have expected properties', () => {
      expect(dataViewLazy).toHaveProperty('getScriptedFields');
      expect(dataViewLazy).toHaveProperty('removeScriptedField');
      expect(dataViewLazy).toHaveProperty('addRuntimeField');
      expect(dataViewLazy).toHaveProperty('removeRuntimeField');
    });
  });

  describe('fields', () => {
    test('should have expected properties on fields', async function () {
      const { bytes: field } = (
        await dataViewLazy.getFields({ fieldName: ['bytes'] })
      ).getFieldMap();
      expect(field).toHaveProperty('displayName');
      expect(field).toHaveProperty('filterable');
      expect(field).toHaveProperty('sortable');
      expect(field).toHaveProperty('scripted');
      expect(field).toHaveProperty('isMapped');
    });
  });

  describe('sorted fields', () => {
    test('should have expected properties on fields', async function () {
      const fieldMap = (await dataViewLazy.getFields({ fieldName: ['*'] })).getFieldMapSorted();
      const expectSortedsKeys = fieldCapsResponse
        .map((field) => field.name)
        .concat([
          'runtime_field',
          'script date',
          'script murmur3',
          'script number',
          'script string',
        ])
        .sort();
      expect(Object.keys(fieldMap)).toEqual(expectSortedsKeys);
    });
  });

  describe('isTSDBMode', () => {
    const tsdbField: FieldSpec = {
      name: 'tsdb-metric-field',
      type: 'number',
      aggregatable: true,
      searchable: true,
      timeSeriesMetric: 'gauge',
    };

    test('should return false if no fields are tsdb fields', async () => {
      expect(await dataViewLazy.isTSDBMode()).toBe(false);
    });

    test('should return true if some fields are tsdb fields', async () => {
      fieldCapsResponse.push(tsdbField);
      expect(await dataViewLazy.isTSDBMode()).toBe(true);
    });
  });

  describe('getScriptedFields', () => {
    test('should return all scripted fields', async () => {
      const scriptedNames = stubLogstashFields
        .filter((item: DataViewField) => item.scripted === true)
        .map((item: DataViewField) => item.name);
      const respNames = Object.keys(
        (
          await dataViewLazy.getFields({ fieldName: ['*'], mapped: false, runtime: false })
        ).getFieldMap()
      );

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
      const { docvalueFields } = await dataViewLazy.getComputedFields({ fieldName: ['*'] });
      const docValueFieldNames = docvalueFields.map((field) => field.field);

      expect(Object.keys(docValueFieldNames).length).toBe(3);
      expect(docValueFieldNames).toContain('@timestamp');
      expect(docValueFieldNames).toContain('time');
      expect(docValueFieldNames).toContain('utc_time');
    });

    test('should return runtimeField', async () => {
      expect((await dataViewLazy.getComputedFields({ fieldName: ['*'] })).runtimeFields).toEqual({
        runtime_field: runtimeFieldScript,
      });
    });

    test('should request date field doc values in date_time format', async () => {
      const { docvalueFields } = await dataViewLazy.getComputedFields({ fieldName: ['*'] });
      const timestampField = docvalueFields.find((field) => field.field === '@timestamp');

      expect(timestampField).toHaveProperty('format', 'date_time');
    });

    test('should not request scripted date fields as docvalue_fields', async () => {
      const { docvalueFields } = await dataViewLazy.getComputedFields({ fieldName: ['*'] });

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

      const fieldMap = (
        await dataViewLazy.getFields({ fieldName: ['*'], scripted: false })
      ).getFieldMap();

      const respNames = map(fieldMap, 'name');

      expect(respNames).toEqual(notScriptedNames);
    });
  });

  describe('add and remove scripted fields', () => {
    test('should append the scripted field', async () => {
      // keep a copy of the current scripted field count
      const oldCount = Object.keys(
        (
          await dataViewLazy.getFields({ fieldName: ['*'], mapped: false, runtime: false })
        ).getFieldMap()
      ).length;

      // add a new scripted field
      const scriptedField = {
        name: 'new scripted field',
        script: 'false',
        type: 'boolean',
      };

      dataViewLazy.upsertScriptedField({
        name: scriptedField.name,
        script: scriptedField.script,
        type: scriptedField.type,
        scripted: true,
        lang: 'painless',
        aggregatable: true,
        searchable: true,
      });

      const scriptedFields = Object.keys(
        (
          await dataViewLazy.getFields({ fieldName: ['*'], mapped: false, runtime: false })
        ).getFieldMap()
      );
      expect(scriptedFields).toHaveLength(oldCount + 1);

      expect((await dataViewLazy.getFieldByName(scriptedField.name))?.name).toEqual(
        scriptedField.name
      );
    });

    test('should remove scripted field, by name', async () => {
      fieldCapsResponse = [];
      const scriptedFields = Object.values(
        (
          await dataViewLazy.getFields({ fieldName: ['*'], mapped: false, runtime: false })
        ).getFieldMap()
      );
      const oldCount = scriptedFields.length;
      const scriptedField = last(scriptedFields)!;

      await dataViewLazy.removeScriptedField(scriptedField.name);

      expect(
        Object.keys(
          (
            await dataViewLazy.getFields({ fieldName: ['*'], mapped: false, runtime: false })
          ).getFieldMap()
        ).length
      ).toEqual(oldCount - 1);

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
      expect((await dataViewLazy.toSpec(toSpecGetAllFields)).fieldFormats).toEqual({
        bytes: { id: 'bytes' },
      });

      dataViewLazy.deleteFieldFormat('bytes');
      expect((await dataViewLazy.toSpec(toSpecGetAllFields)).fieldFormats).toEqual({});
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
      customDescription: 'custom desc',
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
          customDescription: 'custom desc a',
          format: {
            id: 'bytes',
          },
        },
        b: {
          ...runtimeComposite.fields.b,
          popularity: 4,
          customLabel: 'custom name b',
          customDescription: 'custom desc b',
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

    /*
    // keeping disabled test since we'd like to move toward this functionality in the future
    test('add and remove runtime field to existing field', async () => {
      fieldCapsResponse = fieldCapsResponse.filter((field) => field.name === '@tags');
      await dataViewLazy.addRuntimeField('@tags', runtimeWithAttrs);
      expect((await dataViewLazy.toSpec(toSpecGetAllFields)).runtimeFieldMap).toEqual({
        '@tags': runtime,
        runtime_field: runtimeField.runtimeField,
      });
      const field = (await dataViewLazy.toSpec(toSpecGetAllFields))!.fields!['@tags'];
      expect(field.runtimeField).toEqual(runtime);
      expect(field.count).toEqual(5);
      expect(field.format).toEqual({
        id: 'bytes',
      });
      expect(field.customLabel).toEqual('custom name');
      expect((await dataViewLazy.toSpec(toSpecGetAllFields)).fieldAttrs!['@tags']).toEqual({
        customLabel: 'custom name',
        count: 5,
      });

      dataViewLazy.removeRuntimeField('@tags');
      expect((await dataViewLazy.toSpec(toSpecGetAllFields)).runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
      });
      expect(
        (await dataViewLazy.toSpec(toSpecGetAllFields))!.fields!['@tags'].runtimeField
      ).toBeUndefined();
    });
    */

    test('ignore runtime field mapping if a mapped field exists with the same name', async () => {
      expect(dataViewLazy.getRuntimeMappings()).toEqual({
        runtime_field: { script: { source: "emit('hello world')" }, type: 'keyword' },
      });

      // add a runtime field called "theme"
      dataViewLazy.addRuntimeField('theme', runtimeWithAttrs);

      // its added to runtimeFieldMappings
      expect(dataViewLazy.getRuntimeMappings()).toEqual({
        runtime_field: { script: { source: "emit('hello world')" }, type: 'keyword' },
        theme: { script: { source: "emit('hello world');" }, type: 'keyword' },
      });

      // we can get the field
      expect((await dataViewLazy.getFieldByName('theme'))?.runtimeField).toEqual({
        script: { source: "emit('hello world');" },
        type: 'keyword',
      });

      // add a new mapped field also called "theme"
      const themeFieldSpec = {
        name: 'theme',
        type: 'keyword',
        aggregatable: true,
        searchable: true,
        readFromDocValues: false,
        isMapped: true,
      };

      fieldCapsResponse = [themeFieldSpec];

      expect((await dataViewLazy.getFieldByName('theme'))?.runtimeField).toEqual(undefined);
    });

    test('add and remove runtime field as new field', async () => {
      dataViewLazy.addRuntimeField('new_field', runtimeWithAttrs);
      expect((await dataViewLazy.toSpec(toSpecGetAllFields)).runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
        new_field: runtime,
      });
      expect(dataViewLazy.getRuntimeField('new_field')).toMatchSnapshot();
      expect(
        (await dataViewLazy.toSpec(toSpecGetAllFields))!.fields!.new_field.runtimeField
      ).toEqual(runtime);

      dataViewLazy.removeRuntimeField('new_field');
      expect((await dataViewLazy.toSpec(toSpecGetAllFields)).runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
      });
      expect((await dataViewLazy.toSpec(toSpecGetAllFields))!.fields!.new_field).toBeUndefined();
    });

    test('add and remove a custom label from a runtime field', async () => {
      const newField = 'new_field_test';
      fieldCapsResponse = [];
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

    test('add and remove a custom description from a runtime field', async () => {
      const newField = 'new_field_test';
      fieldCapsResponse = [];
      dataViewLazy.addRuntimeField(newField, {
        ...runtimeWithAttrs,
        customDescription: 'test1',
      });
      expect((await dataViewLazy.getFieldByName(newField))?.customDescription).toEqual('test1');
      dataViewLazy.setFieldCustomDescription(newField, 'test2');
      expect((await dataViewLazy.getFieldByName(newField))?.customDescription).toEqual('test2');
      dataViewLazy.setFieldCustomDescription(newField, undefined);
      expect((await dataViewLazy.getFieldByName(newField))?.customDescription).toBeUndefined();
      dataViewLazy.removeRuntimeField(newField);
    });

    test('add and remove composite runtime field as new fields', async () => {
      const fieldMap = (await dataViewLazy.getFields({ fieldName: ['*'] })).getFieldMap();
      const fieldCount = Object.values(fieldMap).length;
      await dataViewLazy.addRuntimeField('new_field', runtimeCompositeWithAttrs);
      expect((await dataViewLazy.toSpec(toSpecGetAllFields)).runtimeFieldMap).toEqual({
        new_field: runtimeComposite,
        runtime_field: runtimeField.runtimeField,
      });
      expect(
        Object.values((await dataViewLazy.getFields({ fieldName: ['*'] })).getFieldMap()).length -
          fieldCount
      ).toEqual(2);
      expect(Object.keys(dataViewLazy.getRuntimeFields({ fieldName: ['new_field.a'] }))).toEqual([
        'new_field.a',
      ]);
      expect(dataViewLazy.getRuntimeField('new_field')).toMatchSnapshot();
      expect((await dataViewLazy.toSpec(toSpecGetAllFields))!.fields!['new_field.a']).toBeDefined();
      expect((await dataViewLazy.toSpec(toSpecGetAllFields))!.fields!['new_field.b']).toBeDefined();
      expect((await dataViewLazy.toSpec(toSpecGetAllFields)).fieldAttrs!['new_field.a']).toEqual({
        count: 3,
        customLabel: 'custom name a',
        customDescription: 'custom desc a',
      });
      expect((await dataViewLazy.toSpec(toSpecGetAllFields)).fieldAttrs!['new_field.b']).toEqual({
        count: 4,
        customLabel: 'custom name b',
        customDescription: 'custom desc b',
      });

      dataViewLazy.removeRuntimeField('new_field');
      expect((await dataViewLazy.toSpec(toSpecGetAllFields)).runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
      });
      expect((await dataViewLazy.toSpec(toSpecGetAllFields))!.fields!.new_field).toBeUndefined();
    });

    test('should not allow runtime field with * in name', async () => {
      try {
        await dataViewLazy.addRuntimeField('test*123', runtime);
      } catch (e) {
        expect(e).toBeInstanceOf(CharacterNotAllowedInField);
      }
    });
  });

  describe('getIndexPattern', () => {
    test('should return the index pattern, labeled title on the data view spec', () => {
      expect(dataViewLazy.getIndexPattern()).toBe(
        stubbedSavedObjectIndexPattern().attributes.title
      );
    });

    test('setIndexPattern', () => {
      dataViewLazy.setIndexPattern('test');
      expect(dataViewLazy.getIndexPattern()).toBe('test');
    });
  });

  describe('getFormatterForField', () => {
    test('should return the default one for empty objects', () => {
      dataViewLazy.setFieldFormat('scriptedFieldWithEmptyFormatter', {});
      expect(
        dataViewLazy.getFormatterForField({
          name: 'scriptedFieldWithEmptyFormatter',
          type: 'number',
          esTypes: ['long'],
          searchable: true,
          aggregatable: true,
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
    test('should match snapshot', async () => {
      const formatter = {
        toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }),
      } as unknown as FieldFormat;
      dataViewLazy.getFormatterForField = () => formatter;
      expect(await dataViewLazy.toSpec(toSpecGetAllFields)).toMatchSnapshot();
    });

    test('can optionally exclude fields', async () => {
      expect(await dataViewLazy.toSpec()).toMatchSnapshot();
    });

    test('can restore from spec', async () => {
      const formatter = {
        toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }),
      } as unknown as FieldFormat;
      dataViewLazy.getFormatterForField = () => formatter;
      const spec = await dataViewLazy.toSpec(toSpecGetAllFields);
      const restoredPattern = new DataViewLazy({
        spec,
        fieldFormats: fieldFormatsMock,
        shortDotsEnable: false,
        metaFields: [],
        apiClient: {
          getFieldsForWildcard: jest
            .fn()
            .mockImplementation(() => Promise.resolve({ fields: fieldCapsResponse })),
        } as any,
        scriptedFieldsEnabled: true,
      });
      expect(restoredPattern.id).toEqual(dataViewLazy.id);
      expect(restoredPattern.getIndexPattern()).toEqual(dataViewLazy.getIndexPattern());
      expect(restoredPattern.timeFieldName).toEqual(dataViewLazy.timeFieldName);
      const restoredPatternFieldMap = (
        await restoredPattern.getFields({ fieldName: ['*'] })
      ).getFieldMap();
      const fieldMap = (await dataViewLazy.getFields({ fieldName: ['*'] })).getFieldMap();
      expect(Object.keys(restoredPatternFieldMap).length).toEqual(Object.keys(fieldMap).length);
    });

    test('creating from spec does not contain references to spec', () => {
      const sourceFilters = [{ value: 'test' }];
      const spec = { sourceFilters };
      const dataView1 = create('test1', spec);
      const dataView2 = create('test2', spec);
      expect(dataView1.sourceFilters).not.toBe(dataView2.sourceFilters);
    });
  });

  describe('toMinimalSpec', () => {
    test('can exclude fields', async () => {
      expect(await dataViewLazy.toMinimalSpec()).toMatchSnapshot();
    });

    test('can omit counts', async () => {
      const fieldsMap = {
        test1: {
          name: 'test1',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
        test2: {
          name: 'test2',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
        test3: {
          name: 'test3',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
      };
      expect(
        (
          await create('test', {
            id: 'test',
            title: 'test*',
            fields: fieldsMap,
            fieldAttrs: undefined,
          }).toMinimalSpec()
        ).fieldAttrs
      ).toBeUndefined();
      expect(
        (
          await create('test', {
            id: 'test',
            title: 'test*',
            fields: fieldsMap,
            fieldAttrs: {
              test1: {
                count: 11,
              },
              test2: {
                count: 12,
              },
            },
          }).toMinimalSpec()
        ).fieldAttrs
      ).toBeUndefined();

      expect(
        (
          await create('test', {
            id: 'test',
            title: 'test*',
            fields: fieldsMap,
            fieldAttrs: {
              test1: {
                count: 11,
                customLabel: 'test11',
              },
              test2: {
                count: 12,
              },
            },
          }).toMinimalSpec()
        ).fieldAttrs
      ).toMatchInlineSnapshot(`
        Object {
          "test1": Object {
            "customLabel": "test11",
          },
        }
      `);

      expect(
        (
          await create('test', {
            id: 'test',
            title: 'test*',
            fields: fieldsMap,
            fieldAttrs: {
              test1: {
                count: 11,
                customLabel: 'test11',
              },
              test2: {
                customLabel: 'test12',
                customDescription: 'test12 description',
              },
              test3: {
                count: 30,
              },
              test4: {
                customDescription: 'test14 description',
              },
            },
          }).toMinimalSpec()
        ).fieldAttrs
      ).toMatchInlineSnapshot(`
        Object {
          "test1": Object {
            "customLabel": "test11",
          },
          "test2": Object {
            "customDescription": "test12 description",
            "customLabel": "test12",
          },
          "test4": Object {
            "customDescription": "test14 description",
          },
        }
      `);
    });

    test('can customize what attributes to keep', () => {
      const fieldsMap = {
        test1: {
          name: 'test1',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
        test2: {
          name: 'test2',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
        test3: {
          name: 'test3',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
        test4: {
          name: 'test4',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
      };

      const spec = {
        id: 'test',
        title: 'test*',
        fields: fieldsMap,
        fieldAttrs: {
          test1: {
            count: 11,
            customLabel: 'test11',
          },
          test2: {
            customLabel: 'test12',
            customDescription: 'test12 description',
          },
          test3: {
            count: 30,
          },
          test4: {
            customDescription: 'test14 description',
          },
        },
      };

      expect(create('test', spec).toMinimalSpec({ keepFieldAttrs: ['customLabel'] }).fieldAttrs)
        .toMatchInlineSnapshot(`
        Object {
          "test1": Object {
            "customLabel": "test11",
          },
          "test2": Object {
            "customLabel": "test12",
          },
        }
      `);

      expect(
        create('test', spec).toMinimalSpec({ keepFieldAttrs: ['customDescription'] }).fieldAttrs
      ).toMatchInlineSnapshot(`
        Object {
          "test2": Object {
            "customDescription": "test12 description",
          },
          "test4": Object {
            "customDescription": "test14 description",
          },
        }
      `);

      expect(
        create('test', spec).toMinimalSpec({ keepFieldAttrs: ['customLabel', 'customDescription'] })
          .fieldAttrs
      ).toMatchInlineSnapshot(`
        Object {
          "test1": Object {
            "customLabel": "test11",
          },
          "test2": Object {
            "customDescription": "test12 description",
            "customLabel": "test12",
          },
          "test4": Object {
            "customDescription": "test14 description",
          },
        }
      `);

      expect(
        create('test', spec).toMinimalSpec({ keepFieldAttrs: [] }).fieldAttrs
      ).toMatchInlineSnapshot(`undefined`);
    });
  });
});
