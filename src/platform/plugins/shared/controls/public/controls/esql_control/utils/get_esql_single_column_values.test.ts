/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ISearchGeneric } from '@kbn/search-types';
import type {
  GetESQLSingleColumnValuesSuccess,
  GetESQLSingleColumnValuesFailure,
} from './get_esql_single_column_values';
import { getESQLSingleColumnValues } from './get_esql_single_column_values';

const mockGetESQLResults = jest.fn();
jest.mock('@kbn/esql-utils', () => ({
  getESQLResults: (...args: any[]) => mockGetESQLResults(...args),
}));

const searchMock = {} as ISearchGeneric;

describe('getESQLSingleColumnValues', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it('returns only options on success', async () => {
    mockGetESQLResults.mockResolvedValueOnce({
      response: {
        columns: [{ name: 'column1' }],
        values: [['option1'], ['option2']],
      },
    });
    const result = (await getESQLSingleColumnValues({
      query: 'FROM index | STATS BY column',
      search: searchMock,
      esqlVariables: [],
    })) as GetESQLSingleColumnValuesSuccess;
    expect(getESQLSingleColumnValues.isSuccess(result)).toBe(true);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "values": Array [
          "option1",
          "option2",
        ],
      }
    `);
  });
  it('returns an error when query returns multiple columns', async () => {
    mockGetESQLResults.mockResolvedValueOnce({
      response: {
        columns: [{ name: 'column1' }, { name: 'column2' }],
        values: [['option1'], ['option2']],
      },
    });
    const result = (await getESQLSingleColumnValues({
      query: 'FROM index',
      search: searchMock,
      esqlVariables: [],
    })) as GetESQLSingleColumnValuesFailure;
    expect(getESQLSingleColumnValues.isSuccess(result)).toBe(false);
    expect('values' in result).toBe(false);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          [Error: Query must return a single column],
        ],
      }
    `);
  });
  it('returns an error on a failed query', async () => {
    mockGetESQLResults.mockRejectedValueOnce('Invalid ES|QL query');
    const result = (await getESQLSingleColumnValues({
      query: 'FROM index | EVAL',
      search: searchMock,
      esqlVariables: [],
    })) as GetESQLSingleColumnValuesFailure;
    expect(getESQLSingleColumnValues.isSuccess(result)).toBe(false);
    expect('values' in result).toBe(false);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          "Invalid ES|QL query",
        ],
      }
    `);
  });

  it('passes timeRange successfully', async () => {
    const timeRange = { from: 'now-10m', to: 'now' };
    await getESQLSingleColumnValues({
      query: 'FROM index | STATS BY column',
      search: searchMock,
      timeRange,
      esqlVariables: [],
    });
    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange,
      })
    );
  });
});
