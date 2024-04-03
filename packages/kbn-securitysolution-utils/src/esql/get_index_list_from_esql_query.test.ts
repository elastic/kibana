/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { getIndexListFromEsqlQuery } from './get_index_list_from_esql_query';

jest.mock('@kbn/esql-utils', () => {
  return {
    getIndexPatternFromESQLQuery: jest.fn(),
  };
});

const getIndexPatternFromESQLQueryMock = getIndexPatternFromESQLQuery as jest.Mock;

describe('getIndexListFromEsqlQuery', () => {
  it('should return empty array if index string is empty', () => {
    getIndexPatternFromESQLQueryMock.mockReturnValue('');
    expect(getIndexListFromEsqlQuery('')).toEqual([]);
  });
  it('should return single item array if one index present', () => {
    getIndexPatternFromESQLQueryMock.mockReturnValue('test-1');
    expect(getIndexListFromEsqlQuery('From test-1')).toEqual(['test-1']);
  });
  it('should return array if index string has multiple indices', () => {
    getIndexPatternFromESQLQueryMock.mockReturnValue('test-1,test-2');
    expect(getIndexListFromEsqlQuery('From test-1,test-2')).toEqual(['test-1', 'test-2']);
  });
  it('should trim spaces in index names', () => {
    getIndexPatternFromESQLQueryMock.mockReturnValue('test-1 , test-2 ');
    expect(getIndexListFromEsqlQuery('From  test-1, test-2 ')).toEqual(['test-1', 'test-2']);
  });
});
