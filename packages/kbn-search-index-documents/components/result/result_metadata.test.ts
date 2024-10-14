/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import { reorderFieldsInImportance, resultTitle } from './result_metadata';
import { FieldProps } from './result_types';

const makeSearchHit = (source: undefined | unknown): SearchHit =>
  ({
    _source: source,
  } as SearchHit);

describe('resultTitle', () => {
  it('returns result title if available', () => {
    expect(resultTitle(makeSearchHit({ title: 'test 123' }))).toEqual('test 123');
    expect(resultTitle(makeSearchHit({ name: 'this is a name' }))).toEqual('this is a name');
    expect(resultTitle(makeSearchHit({ name: 'this is a name', title: 'test 123' }))).toEqual(
      'test 123'
    );
    expect(resultTitle(makeSearchHit({ other: 'thing' }))).toEqual(undefined);
    expect(resultTitle(makeSearchHit(undefined))).toEqual(undefined);
  });
});

describe('reorderFieldsInImportance', () => {
  it('sorts fields by type and name', () => {
    const fields: FieldProps[] = [
      { fieldName: 'field6', fieldType: 'sparse_vector', fieldValue: 'value6' },
      { fieldName: 'field1', fieldType: 'semantic_text', fieldValue: 'value1' },
      { fieldName: 'field2', fieldType: 'dense_vector', fieldValue: 'value2' },
      { fieldName: 'field3', fieldType: 'sparse_vector', fieldValue: 'value3' },
      { fieldName: 'field4', fieldType: 'semantic_text', fieldValue: 'value4' },
      { fieldName: 'field5', fieldType: 'dense_vector', fieldValue: 'value5' },
    ];
    const sortedFields = [
      { fieldName: 'field1', fieldType: 'semantic_text', fieldValue: 'value1' },
      { fieldName: 'field4', fieldType: 'semantic_text', fieldValue: 'value4' },
      { fieldName: 'field2', fieldType: 'dense_vector', fieldValue: 'value2' },
      { fieldName: 'field5', fieldType: 'dense_vector', fieldValue: 'value5' },
      { fieldName: 'field3', fieldType: 'sparse_vector', fieldValue: 'value3' },
      { fieldName: 'field6', fieldType: 'sparse_vector', fieldValue: 'value6' },
    ];
    expect(reorderFieldsInImportance(fields)).toEqual(sortedFields);
  });

  it('sorts fields if they are special fields', () => {
    const fields: FieldProps[] = [
      { fieldName: 'field2', fieldType: 'dense_vector', fieldValue: 'value2' },
      { fieldName: 'body_content', fieldType: 'sparse_vector', fieldValue: 'value3' },
      { fieldName: 'headings', fieldType: 'text', fieldValue: 'value1' },
      { fieldName: 'field4', fieldType: 'semantic_text', fieldValue: 'value4' },
      { fieldName: 'field5', fieldType: 'dense_vector', fieldValue: 'value5' },
      { fieldName: 'field6', fieldType: 'sparse_vector', fieldValue: 'value6' },
    ];
    const sortedFields = [
      { fieldName: 'headings', fieldType: 'text', fieldValue: 'value1' },
      { fieldName: 'field4', fieldType: 'semantic_text', fieldValue: 'value4' },
      { fieldName: 'field2', fieldType: 'dense_vector', fieldValue: 'value2' },
      { fieldName: 'field5', fieldType: 'dense_vector', fieldValue: 'value5' },
      { fieldName: 'body_content', fieldType: 'sparse_vector', fieldValue: 'value3' },
      { fieldName: 'field6', fieldType: 'sparse_vector', fieldValue: 'value6' },
    ];
    expect(reorderFieldsInImportance(fields)).toEqual(sortedFields);
  });
});
