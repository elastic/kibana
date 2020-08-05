/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Field } from './field';
import { IndexPattern } from '../index_patterns';
import { FieldFormatsStartCommon } from '../..';
import { KBN_FIELD_TYPES, FieldSpec, FieldSpecExportFmt } from '../../../common';

describe('Field', function () {
  function flatten(obj: Record<string, any>) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getField(values = {}) {
    return new Field(
      fieldValues.indexPattern as IndexPattern,
      { ...fieldValues, ...values },
      false,
      {
        fieldFormats: {} as FieldFormatsStartCommon,
        onNotification: () => {},
      }
    );
  }

  const fieldValues = {
    name: 'name',
    type: 'type',
    script: 'script',
    lang: 'lang',
    count: 1,
    esTypes: ['type'],
    aggregatable: true,
    filterable: true,
    searchable: true,
    sortable: true,
    readFromDocValues: false,
    visualizable: true,
    scripted: true,
    subType: { multi: { parent: 'parent' }, nested: { path: 'path' } },
    displayName: 'displayName',
    indexPattern: ({
      fieldFormatMap: { name: {}, _source: {}, _score: {}, _id: {} },
    } as unknown) as IndexPattern,
    format: { name: 'formatName' },
    $$spec: ({} as unknown) as FieldSpec,
    conflictDescriptions: { a: ['b', 'c'], d: ['e'] },
    toSpec: () => (({} as unknown) as FieldSpecExportFmt),
  } as Field;

  it('the correct properties are writable', () => {
    const field = getField();

    expect(field.count).toEqual(1);
    field.count = 2;
    expect(field.count).toEqual(2);

    expect(field.script).toEqual(fieldValues.script);
    field.script = '1';
    expect(field.script).toEqual('1');

    expect(field.lang).toEqual(fieldValues.lang);
    field.lang = 'painless';
    expect(field.lang).toEqual('painless');

    expect(field.conflictDescriptions).toEqual(fieldValues.conflictDescriptions);
    field.conflictDescriptions = {};
    expect(field.conflictDescriptions).toEqual({});
  });

  it('the correct properties are not writable', () => {
    const field = getField();

    expect(field.name).toEqual(fieldValues.name);
    field.name = 'newName';
    expect(field.name).toEqual(fieldValues.name);

    expect(field.type).toEqual(fieldValues.type);
    field.type = 'newType';
    expect(field.type).toEqual(fieldValues.type);

    expect(field.esTypes).toEqual(fieldValues.esTypes);
    field.esTypes = ['newType'];
    expect(field.esTypes).toEqual(fieldValues.esTypes);

    expect(field.scripted).toEqual(fieldValues.scripted);
    field.scripted = false;
    expect(field.scripted).toEqual(fieldValues.scripted);

    expect(field.searchable).toEqual(fieldValues.searchable);
    field.searchable = false;
    expect(field.searchable).toEqual(fieldValues.searchable);

    expect(field.aggregatable).toEqual(fieldValues.aggregatable);
    field.aggregatable = false;
    expect(field.aggregatable).toEqual(fieldValues.aggregatable);

    expect(field.readFromDocValues).toEqual(fieldValues.readFromDocValues);
    field.readFromDocValues = true;
    expect(field.readFromDocValues).toEqual(fieldValues.readFromDocValues);

    expect(field.subType).toEqual(fieldValues.subType);
    field.subType = {};
    expect(field.subType).toEqual(fieldValues.subType);

    // not writable, not serialized
    expect(() => {
      field.indexPattern = {} as IndexPattern;
    }).toThrow();

    // computed fields
    expect(() => {
      field.format = { name: 'newFormatName' };
    }).toThrow();

    expect(() => {
      field.sortable = false;
    }).toThrow();

    expect(() => {
      field.filterable = false;
    }).toThrow();

    expect(() => {
      field.visualizable = false;
    }).toThrow();

    expect(() => {
      field.displayName = 'newDisplayName';
    }).toThrow();

    expect(() => {
      field.$$spec = ({ a: 'b' } as unknown) as FieldSpec;
    }).toThrow();
  });

  it('sets type field when _source field', () => {
    const field = getField({ name: '_source' });
    expect(field.type).toEqual('_source');
  });

  it('calculates searchable', () => {
    const field = getField({ searchable: true, scripted: false });
    expect(field.searchable).toEqual(true);

    const fieldB = getField({ searchable: false, scripted: true });
    expect(fieldB.searchable).toEqual(true);

    const fieldC = getField({ searchable: false, scripted: false });
    expect(fieldC.searchable).toEqual(false);
  });

  it('calculates aggregatable', () => {
    const field = getField({ aggregatable: true, scripted: false });
    expect(field.aggregatable).toEqual(true);

    const fieldB = getField({ aggregatable: false, scripted: true });
    expect(fieldB.aggregatable).toEqual(true);

    const fieldC = getField({ aggregatable: false, scripted: false });
    expect(fieldC.aggregatable).toEqual(false);
  });

  it('calculates readFromDocValues', () => {
    const field = getField({ readFromDocValues: true, scripted: false });
    expect(field.readFromDocValues).toEqual(true);

    const fieldB = getField({ readFromDocValues: false, scripted: false });
    expect(fieldB.readFromDocValues).toEqual(false);

    const fieldC = getField({ readFromDocValues: true, scripted: true });
    expect(fieldC.readFromDocValues).toEqual(false);
  });

  it('calculates sortable', () => {
    const field = getField({ name: '_score' });
    expect(field.sortable).toEqual(true);

    const fieldB = getField({ indexed: true, type: KBN_FIELD_TYPES.STRING });
    expect(fieldB.sortable).toEqual(true);

    const fieldC = getField({ indexed: false });
    expect(fieldC.sortable).toEqual(false);
  });

  it('calculates filterable', () => {
    const field = getField({ name: '_id' });
    expect(field.filterable).toEqual(true);

    const fieldB = getField({ scripted: true });
    expect(fieldB.filterable).toEqual(true);

    const fieldC = getField({ indexed: true, type: KBN_FIELD_TYPES.STRING });
    expect(fieldC.filterable).toEqual(true);

    const fieldD = getField({ scripted: false, indexed: false });
    expect(fieldD.filterable).toEqual(false);
  });

  it('exports the property to JSON', () => {
    const field = new Field({ fieldFormatMap: { name: {} } } as IndexPattern, fieldValues, false, {
      fieldFormats: {} as FieldFormatsStartCommon,
      onNotification: () => {},
    });
    expect(flatten(field)).toMatchSnapshot();
  });

  it('spec snapshot', () => {
    const field = new Field(
      {
        fieldFormatMap: {
          name: { toJSON: () => ({ id: 'number', params: { pattern: '$0,0.[00]' } }) },
        },
      } as IndexPattern,
      fieldValues,
      false,
      {
        fieldFormats: {} as FieldFormatsStartCommon,
        onNotification: () => {},
      }
    );
    expect(field.toSpec()).toMatchSnapshot();
  });
});
