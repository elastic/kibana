/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { filterFieldToList } from '.';

import { getListResponseMock } from '../list_schema/index.mock';
import { DataViewFieldBase } from '@kbn/es-query';
import { AutocompleteListsData } from '../field_value_lists';

const emptyListData: AutocompleteListsData = { smallLists: [], largeLists: [] };

describe('#filterFieldToList', () => {
  test('it returns empty list data object if given a undefined for field', () => {
    const filter = filterFieldToList(emptyListData, undefined);
    expect(filter).toEqual(emptyListData);
  });

  test('it returns empty list data object if filed does not contain esTypes', () => {
    const field: DataViewFieldBase = {
      name: 'some-name',
      type: 'some-type',
    };
    const filter = filterFieldToList(emptyListData, field);
    expect(filter).toEqual(emptyListData);
  });

  test('it returns filtered lists of ip_range -> ip', () => {
    const field: DataViewFieldBase & { esTypes: string[] } = {
      esTypes: ['ip'],
      name: 'some-name',
      type: 'ip',
    };
    const listData: AutocompleteListsData = {
      smallLists: [{ ...getListResponseMock(), type: 'ip_range' }],
      largeLists: [],
    };
    const filter = filterFieldToList(listData, field);
    const expected = listData;
    expect(filter).toEqual(expected);
  });

  test('it returns filtered lists of ip -> ip', () => {
    const field: DataViewFieldBase & { esTypes: string[] } = {
      esTypes: ['ip'],
      name: 'some-name',
      type: 'ip',
    };
    const listData: AutocompleteListsData = {
      smallLists: [{ ...getListResponseMock(), type: 'ip' }],
      largeLists: [],
    };
    const filter = filterFieldToList(listData, field);
    const expected = listData;
    expect(filter).toEqual(expected);
  });

  test('it returns filtered lists of keyword -> keyword', () => {
    const field: DataViewFieldBase & { esTypes: string[] } = {
      esTypes: ['keyword'],
      name: 'some-name',
      type: 'keyword',
    };
    const listData: AutocompleteListsData = {
      smallLists: [{ ...getListResponseMock(), type: 'keyword' }],
      largeLists: [],
    };
    const filter = filterFieldToList(listData, field);
    const expected = listData;
    expect(filter).toEqual(expected);
  });

  test('it returns filtered lists of text -> text', () => {
    const field: DataViewFieldBase & { esTypes: string[] } = {
      esTypes: ['text'],
      name: 'some-name',
      type: 'text',
    };
    const listData: AutocompleteListsData = {
      smallLists: [{ ...getListResponseMock(), type: 'text' }],
      largeLists: [],
    };
    const filter = filterFieldToList(listData, field);
    const expected = listData;
    expect(filter).toEqual(expected);
  });

  test('it returns small and large filtered lists of ip_range -> ip', () => {
    const field: DataViewFieldBase & { esTypes: string[] } = {
      esTypes: ['ip'],
      name: 'some-name',
      type: 'ip',
    };
    const listData: AutocompleteListsData = {
      smallLists: [{ ...getListResponseMock(), type: 'ip_range' }],
      largeLists: [{ ...getListResponseMock(), type: 'ip_range' }],
    };
    const filter = filterFieldToList(listData, field);
    const expected = listData;
    expect(filter).toEqual(expected);
  });

  test('it returns 1 filtered lists of ip_range -> ip if the 2nd is not compatible type', () => {
    const field: DataViewFieldBase & { esTypes: string[] } = {
      esTypes: ['ip'],
      name: 'some-name',
      type: 'ip',
    };
    const listData: AutocompleteListsData = {
      smallLists: [{ ...getListResponseMock(), type: 'ip_range' }],
      largeLists: [{ ...getListResponseMock(), type: 'text' }],
    };
    const filter = filterFieldToList(listData, field);
    const expected: AutocompleteListsData = {
      smallLists: [{ ...getListResponseMock(), type: 'ip_range' }],
      largeLists: [],
    };
    expect(filter).toEqual(expected);
  });
});
