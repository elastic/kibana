/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FieldFormat } from '@kbn/field-formats-plugin/common';

import { RuntimeField, RuntimePrimitiveTypes, FieldSpec, DataViewSpec } from '../types';
import { stubLogstashFields } from '../field.stub';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { CharacterNotAllowedInField } from '@kbn/kibana-utils-plugin/common';
import { last, map } from 'lodash';
import { stubbedSavedObjectIndexPattern } from '../data_view.stub';
import { DataViewField } from '../fields';
import { DataView } from './data_view';

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
  esTypes: ['keyword'],
  type: 'string',
};

fieldFormatsMock.getInstance = jest.fn().mockImplementation(() => new MockFieldFormatter());

// helper function to create index patterns
function create(id: string, spec?: DataViewSpec) {
  const {
    type,
    version,
    attributes: { timeFieldName, fields, title, name },
  } = stubbedSavedObjectIndexPattern(id);

  return new DataView({
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
  });
}

describe('IndexPattern', () => {
  let indexPattern: DataView;

  // create an indexPattern instance for each test
  beforeEach(() => {
    indexPattern = create('test-pattern');
  });

  describe('api', () => {
    test('should have expected properties', () => {
      expect(indexPattern).toHaveProperty('getScriptedFields');
      expect(indexPattern).toHaveProperty('getNonScriptedFields');
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

  describe('getScriptedFields', () => {
    test('should return all scripted fields', () => {
      const scriptedNames = stubLogstashFields
        .filter((item: DataViewField) => item.scripted === true)
        .map((item: DataViewField) => item.name);
      const respNames = map(indexPattern.getScriptedFields(), 'name');

      expect(respNames).toEqual(scriptedNames);
    });
  });

  describe('getComputedFields', () => {
    test('should be a function', () => {
      expect(indexPattern.getComputedFields).toBeInstanceOf(Function);
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
      const notScriptedNames = stubLogstashFields
        .filter((item: DataViewField) => item.scripted === false)
        .map((item: DataViewField) => item.name);
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

      indexPattern.fields.add({
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

      const scriptedFields = indexPattern.getScriptedFields();
      expect(scriptedFields).toHaveLength(oldCount + 1);
      expect((indexPattern.fields.getByName(scriptedField.name) as DataViewField).name).toEqual(
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
      indexPattern.getFormatterForField = () => formatter;
      indexPattern.getFormatterForFieldNoDefault = () => undefined;
    });

    test('add and remove runtime field to existing field', () => {
      indexPattern.addRuntimeField('@tags', runtimeWithAttrs);
      expect(indexPattern.toSpec().runtimeFieldMap).toEqual({
        '@tags': runtime,
        runtime_field: runtimeField.runtimeField,
      });
      const field = indexPattern.toSpec()!.fields!['@tags'];
      expect(field.runtimeField).toEqual(runtime);
      expect(field.count).toEqual(5);
      expect(field.format).toEqual({
        id: 'bytes',
      });
      expect(field.customLabel).toEqual('custom name');
      expect(field.customDescription).toEqual('custom desc');
      expect(indexPattern.toSpec().fieldAttrs!['@tags']).toEqual({
        customLabel: 'custom name',
        customDescription: 'custom desc',
        count: 5,
      });

      indexPattern.removeRuntimeField('@tags');
      expect(indexPattern.toSpec().runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
      });
      expect(indexPattern.toSpec()!.fields!['@tags'].runtimeField).toBeUndefined();
    });

    test('ignore runtime field mapping if a mapped field exists with the same name', () => {
      expect(indexPattern.getRuntimeMappings()).toEqual({
        runtime_field: { script: { source: "emit('hello world')" }, type: 'keyword' },
      });

      // add a runtime field called "theme"
      indexPattern.addRuntimeField('theme', runtimeWithAttrs);

      // add a new mapped field also called "theme"
      indexPattern.fields.add({
        name: 'theme',
        type: 'keyword',
        aggregatable: true,
        searchable: true,
        readFromDocValues: false,
        isMapped: true,
      });

      expect(indexPattern.getRuntimeMappings()).toEqual({
        runtime_field: { script: { source: "emit('hello world')" }, type: 'keyword' },
      });
    });

    test('add and remove runtime field as new field', () => {
      indexPattern.addRuntimeField('new_field', runtimeWithAttrs);
      expect(indexPattern.toSpec().runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
        new_field: runtime,
      });
      expect(indexPattern.getRuntimeField('new_field')).toMatchSnapshot();
      expect(indexPattern.toSpec()!.fields!.new_field.runtimeField).toEqual(runtime);

      indexPattern.removeRuntimeField('new_field');
      expect(indexPattern.toSpec().runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
      });
      expect(indexPattern.toSpec()!.fields!.new_field).toBeUndefined();
    });

    test('add and remove a custom label from a runtime field', () => {
      const newField = 'new_field_test';
      indexPattern.addRuntimeField(newField, {
        ...runtimeWithAttrs,
        customLabel: 'test1',
      });
      expect(indexPattern.getFieldByName(newField)?.customLabel).toEqual('test1');
      indexPattern.setFieldCustomLabel(newField, 'test2');
      expect(indexPattern.getFieldByName(newField)?.customLabel).toEqual('test2');
      indexPattern.setFieldCustomLabel(newField, undefined);
      expect(indexPattern.getFieldByName(newField)?.customLabel).toBeUndefined();
      indexPattern.removeRuntimeField(newField);
    });

    test('add and remove a custom description from a runtime field', () => {
      const newField = 'new_field_test';
      indexPattern.addRuntimeField(newField, {
        ...runtimeWithAttrs,
        customDescription: 'test1',
      });
      expect(indexPattern.getFieldByName(newField)?.customDescription).toEqual('test1');
      indexPattern.setFieldCustomDescription(newField, 'test2');
      expect(indexPattern.getFieldByName(newField)?.customDescription).toEqual('test2');
      indexPattern.setFieldCustomDescription(newField, undefined);
      expect(indexPattern.getFieldByName(newField)?.customDescription).toBeUndefined();
      indexPattern.removeRuntimeField(newField);
    });

    test('add and remove composite runtime field as new fields', () => {
      const fieldCount = indexPattern.fields.length;
      indexPattern.addRuntimeField('new_field', runtimeCompositeWithAttrs);
      expect(indexPattern.toSpec().runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
        new_field: runtimeComposite,
      });
      expect(indexPattern.fields.length - fieldCount).toEqual(2);
      expect(indexPattern.getRuntimeField('new_field')).toMatchSnapshot();
      expect(indexPattern.toSpec()!.fields!['new_field.a']).toBeDefined();
      expect(indexPattern.toSpec()!.fields!['new_field.b']).toBeDefined();
      expect(indexPattern.toSpec().fieldAttrs!['new_field.a']).toEqual({
        count: 3,
        customLabel: 'custom name a',
        customDescription: 'custom desc a',
      });
      expect(indexPattern.toSpec().fieldAttrs!['new_field.b']).toEqual({
        count: 4,
        customLabel: 'custom name b',
        customDescription: 'custom desc b',
      });

      indexPattern.removeRuntimeField('new_field');
      expect(indexPattern.toSpec().runtimeFieldMap).toEqual({
        runtime_field: runtimeField.runtimeField,
      });
      expect(indexPattern.toSpec()!.fields!.new_field).toBeUndefined();
    });

    test('should not allow runtime field with * in name', () => {
      try {
        indexPattern.addRuntimeField('test*123', runtime);
      } catch (e) {
        expect(e).toBeInstanceOf(CharacterNotAllowedInField);
      }
    });
  });

  describe('getIndexPattern', () => {
    test('should return the index pattern, labeled title on the data view spec', () => {
      expect(indexPattern.getIndexPattern()).toBe(
        stubbedSavedObjectIndexPattern().attributes.title
      );
    });

    test('setIndexPattern', () => {
      indexPattern.setIndexPattern('test');
      expect(indexPattern.getIndexPattern()).toBe('test');
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
    test('should match snapshot', () => {
      const formatter = {
        toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }),
      } as unknown as FieldFormat;
      indexPattern.getFormatterForField = () => formatter;
      expect(indexPattern.toSpec()).toMatchSnapshot();
    });

    test('can optionally exclude fields', () => {
      expect(indexPattern.toSpec(false)).toMatchSnapshot();
    });

    test('can restore from spec', async () => {
      const formatter = {
        toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }),
      } as unknown as FieldFormat;
      indexPattern.getFormatterForField = () => formatter;
      const spec = indexPattern.toSpec();
      const restoredPattern = new DataView({
        spec,
        fieldFormats: fieldFormatsMock,
        shortDotsEnable: false,
        metaFields: [],
      });
      expect(restoredPattern.id).toEqual(indexPattern.id);
      expect(restoredPattern.getIndexPattern()).toEqual(indexPattern.getIndexPattern());
      expect(restoredPattern.timeFieldName).toEqual(indexPattern.timeFieldName);
      expect(restoredPattern.fields.length).toEqual(indexPattern.fields.length);
    });

    test('creating from spec does not contain references to spec', () => {
      const sourceFilters = [{ value: 'test' }];
      const spec = { sourceFilters };
      const dataView1 = create('test1', spec);
      const dataView2 = create('test2', spec);
      expect(dataView1.sourceFilters).not.toBe(dataView2.sourceFilters);
    });
  });

  describe('should initialize from spec with field attributes', () => {
    it('should read field attrs from fields', () => {
      const dataView = create('test', {
        fields: {
          test1: {
            name: 'test1',
            type: 'keyword',
            aggregatable: true,
            searchable: true,
            readFromDocValues: false,
            customLabel: 'custom test1',
            customDescription: 'custom test1 desc',
            count: 5,
          },
        },
      });
      expect(dataView.getFieldAttrs()).toMatchInlineSnapshot(`
        Object {
          "test1": Object {
            "count": 5,
            "customDescription": "custom test1 desc",
            "customLabel": "custom test1",
          },
        }
      `);
    });

    it('should read field attrs from fields or fieldAttrs', () => {
      const dataView = create('test', {
        fields: {
          test1: {
            name: 'test1',
            type: 'keyword',
            aggregatable: true,
            searchable: true,
            readFromDocValues: false,
            customLabel: 'custom test1',
            customDescription: 'custom test1 desc',
          },
        },
        fieldAttrs: {
          test1: {
            customLabel: 'custom test2',
            customDescription: 'custom test2 desc',
            count: 2,
          },
        },
      });
      expect(dataView.getFieldAttrs()).toMatchInlineSnapshot(`
        Object {
          "test1": Object {
            "count": 2,
            "customDescription": "custom test2 desc",
            "customLabel": "custom test2",
          },
        }
      `);
    });
  });

  describe('toMinimalSpec', () => {
    test('can exclude fields', () => {
      expect(indexPattern.toMinimalSpec()).toMatchSnapshot();
    });

    test('can omit counts', () => {
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
        create('test', {
          id: 'test',
          title: 'test*',
          fields: fieldsMap,
          fieldAttrs: undefined,
        }).toMinimalSpec().fieldAttrs
      ).toBeUndefined();
      expect(
        create('test', {
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
        }).toMinimalSpec().fieldAttrs
      ).toBeUndefined();

      expect(
        create('test', {
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
        }).toMinimalSpec().fieldAttrs
      ).toMatchInlineSnapshot(`
        Object {
          "test1": Object {
            "customLabel": "test11",
          },
        }
      `);

      expect(
        create('test', {
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
        }).toMinimalSpec().fieldAttrs
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
