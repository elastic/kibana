/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { filterFieldToList } from '.';

import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getListResponseMock } from '../list_schema/index.mock';
import { DataViewFieldBase } from '@kbn/es-query';

describe('#filterFieldToList', () => {
  test('it returns empty array if given a undefined for field', () => {
    const filter = filterFieldToList([], undefined);
    expect(filter).toEqual([]);
  });

  test('it returns empty array if filed does not contain esTypes', () => {
    const field: DataViewFieldBase = {
      name: 'some-name',
      type: 'some-type',
    };
    const filter = filterFieldToList([], field);
    expect(filter).toEqual([]);
  });

  test('it returns single filtered list of ip_range -> ip', () => {
    const field: DataViewFieldBase & { esTypes: string[] } = {
      esTypes: ['ip'],
      name: 'some-name',
      type: 'ip',
    };
    const listItem: ListSchema = { ...getListResponseMock(), type: 'ip_range' };
    const filter = filterFieldToList([listItem], field);
    const expected: ListSchema[] = [listItem];
    expect(filter).toEqual(expected);
  });

  test('it returns single filtered list of ip -> ip', () => {
    const field: DataViewFieldBase & { esTypes: string[] } = {
      esTypes: ['ip'],
      name: 'some-name',
      type: 'ip',
    };
    const listItem: ListSchema = { ...getListResponseMock(), type: 'ip' };
    const filter = filterFieldToList([listItem], field);
    const expected: ListSchema[] = [listItem];
    expect(filter).toEqual(expected);
  });

  test('it returns single filtered list of keyword -> keyword', () => {
    const field: DataViewFieldBase & { esTypes: string[] } = {
      esTypes: ['keyword'],
      name: 'some-name',
      type: 'keyword',
    };
    const listItem: ListSchema = { ...getListResponseMock(), type: 'keyword' };
    const filter = filterFieldToList([listItem], field);
    const expected: ListSchema[] = [listItem];
    expect(filter).toEqual(expected);
  });

  test('it returns single filtered list of text -> text', () => {
    const field: DataViewFieldBase & { esTypes: string[] } = {
      esTypes: ['text'],
      name: 'some-name',
      type: 'text',
    };
    const listItem: ListSchema = { ...getListResponseMock(), type: 'text' };
    const filter = filterFieldToList([listItem], field);
    const expected: ListSchema[] = [listItem];
    expect(filter).toEqual(expected);
  });

  test('it returns 2 filtered lists of ip_range -> ip', () => {
    const field: DataViewFieldBase & { esTypes: string[] } = {
      esTypes: ['ip'],
      name: 'some-name',
      type: 'ip',
    };
    const listItem1: ListSchema = { ...getListResponseMock(), type: 'ip_range' };
    const listItem2: ListSchema = { ...getListResponseMock(), type: 'ip_range' };
    const filter = filterFieldToList([listItem1, listItem2], field);
    const expected: ListSchema[] = [listItem1, listItem2];
    expect(filter).toEqual(expected);
  });

  test('it returns 1 filtered lists of ip_range -> ip if the 2nd is not compatible type', () => {
    const field: DataViewFieldBase & { esTypes: string[] } = {
      esTypes: ['ip'],
      name: 'some-name',
      type: 'ip',
    };
    const listItem1: ListSchema = { ...getListResponseMock(), type: 'ip_range' };
    const listItem2: ListSchema = { ...getListResponseMock(), type: 'text' };
    const filter = filterFieldToList([listItem1, listItem2], field);
    const expected: ListSchema[] = [listItem1];
    expect(filter).toEqual(expected);
  });
});
