/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternField } from './data_view_field';
import { IndexPattern } from '..';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldSpec, RuntimeField } from '../types';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

describe('Field', function () {
  function flatten(obj: Record<string, any>) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getField(values = {}) {
    return new IndexPatternField({ ...fieldValues, ...values });
  }

  const fieldValues = {
    name: 'name',
    type: 'string',
    script: 'script',
    lang: 'java' as const,
    count: 1,
    esTypes: ['keyword'],
    aggregatable: true,
    filterable: true,
    searchable: true,
    sortable: true,
    indexed: true,
    readFromDocValues: false,
    visualizable: true,
    scripted: true,
    subType: { multi: { parent: 'parent' }, nested: { path: 'path' } },
    displayName: 'displayName',
    indexPattern: {
      fieldFormatMap: { name: {}, _source: {}, _score: {}, _id: {} },
    } as unknown as IndexPattern,
    $$spec: {} as unknown as FieldSpec,
    conflictDescriptions: { a: ['b', 'c'], d: ['e'] },
    runtimeField: {
      type: 'keyword' as RuntimeField['type'],
      script: {
        source: "emit('hello world')",
      },
    },
  };

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

  it('sets type field when _source field', () => {
    const field = getField({ name: '_source', runtimeField: undefined });
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

  it('calculates visualizable', () => {
    const field = getField({ type: 'unknown' });
    expect(field.visualizable).toEqual(false);

    const fieldB = getField({ type: 'conflict' });
    expect(fieldB.visualizable).toEqual(false);

    const fieldC = getField({ aggregatable: false, scripted: false });
    expect(fieldC.visualizable).toEqual(false);
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

    const fieldC = getField({ indexed: false, aggregatable: false, scripted: false });
    expect(fieldC.sortable).toEqual(false);
  });

  it('calculates filterable', () => {
    const field = getField({ name: '_id' });
    expect(field.filterable).toEqual(true);

    const fieldB = getField({ scripted: true });
    expect(fieldB.filterable).toEqual(true);

    const fieldC = getField({ indexed: true, type: KBN_FIELD_TYPES.STRING });
    expect(fieldC.filterable).toEqual(true);

    const fieldD = getField({ scripted: false, indexed: false, searchable: false });
    expect(fieldD.filterable).toEqual(false);
  });

  it('exports the property to JSON', () => {
    const field = new IndexPatternField(fieldValues);
    expect(flatten(field)).toMatchSnapshot();
  });

  it('spec snapshot', () => {
    const field = new IndexPatternField(fieldValues);
    const getFormatterForField = () =>
      ({
        toJSON: () => ({
          id: 'number',
          params: {
            pattern: '$0,0.[00]',
          },
        }),
      } as unknown as FieldFormat);
    expect(field.toSpec({ getFormatterForField })).toMatchSnapshot();
  });
});
