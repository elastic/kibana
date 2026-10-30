/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  GetESQLSingleColumnValuesSuccess,
  GetESQLSingleColumnValuesFailure,
} from './get_esql_single_column_values';
import { getESQLSingleColumnValues } from './get_esql_single_column_values';

const esqlMock = jest.fn();

describe('getESQLSingleColumnValues', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it('returns string values for non-numeric columns', async () => {
    esqlMock.mockResolvedValueOnce({
      rawResponse: {
        columns: [{ name: 'column1', type: 'keyword' }],
        values: [['option1'], ['option2']],
      },
    });
    const result = (await getESQLSingleColumnValues({
      query: 'FROM index | STATS BY column',
      search: { esql: esqlMock },
      esqlVariables: [],
    })) as GetESQLSingleColumnValuesSuccess;
    expect(getESQLSingleColumnValues.isSuccess(result)).toBe(true);
    expect(getESQLSingleColumnValues.isNumericResult(result)).toBe(false);
    expect(result.values).toEqual(['option1', 'option2']);
  });

  it('coerces values to numbers when the column type is numeric', async () => {
    esqlMock.mockResolvedValueOnce({
      rawResponse: {
        columns: [{ name: 'column1', type: 'long' }],
        values: [['10'], ['20'], ['30']],
      },
    });
    const result = (await getESQLSingleColumnValues({
      query: 'FROM index | KEEP bytes',
      search: { esql: esqlMock },
      esqlVariables: [],
    })) as GetESQLSingleColumnValuesSuccess;
    expect(getESQLSingleColumnValues.isNumericResult(result)).toBe(true);
    expect(result.values).toEqual([10, 20, 30]);
  });

  it('reports the no-results case so callers can distinguish "empty" from "failure"', async () => {
    esqlMock.mockResolvedValueOnce({
      rawResponse: {
        columns: [],
        all_columns: [{ name: 'column1', type: 'keyword' }],
        values: [],
      },
    });
    const result = await getESQLSingleColumnValues({
      query: 'FROM index | WHERE never',
      search: { esql: esqlMock },
      esqlVariables: [],
    });
    expect(getESQLSingleColumnValues.isSuccess(result)).toBe(true);
    expect(getESQLSingleColumnValues.hasNoResults(result)).toBe(true);
  });

  it('returns an error when query returns multiple columns', async () => {
    esqlMock.mockResolvedValueOnce({
      rawResponse: {
        columns: [{ name: 'column1' }, { name: 'column2' }],
        values: [['option1'], ['option2']],
      },
    });
    const result = (await getESQLSingleColumnValues({
      query: 'FROM index',
      search: { esql: esqlMock },
      esqlVariables: [],
    })) as GetESQLSingleColumnValuesFailure;
    expect(getESQLSingleColumnValues.isSuccess(result)).toBe(false);
    expect(getESQLSingleColumnValues.isMultiColumnError(result)).toBe(true);
    expect(result.errors[0].message).toBe('Query must return a single column');
  });
  it('returns an error on a failed query', async () => {
    esqlMock.mockRejectedValueOnce('Invalid ES|QL query');
    const result = (await getESQLSingleColumnValues({
      query: 'FROM index | EVAL',
      search: { esql: esqlMock },
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
      search: { esql: esqlMock },
      timeRange,
      esqlVariables: [],
    });
    expect(esqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kibanaQueryContext: expect.objectContaining({ timeRange }),
      }),
      expect.anything()
    );
  });
});
