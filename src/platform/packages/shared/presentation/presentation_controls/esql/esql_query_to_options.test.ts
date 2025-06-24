/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import {
  esqlQueryToOptions,
  ESQLQueryToOptionsSuccess,
  ESQLQueryToOptionsFailure,
} from './esql_query_to_options';

const mockGetESQLResults = jest.fn();
jest.mock('@kbn/esql-utils', () => ({
  getESQLResults: () => mockGetESQLResults(),
}));

const searchMock = dataPluginMock.createStartContract().search.search;

describe('esqlQueryToOptions', () => {
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
    const result = (await esqlQueryToOptions(
      'FROM index | STATS BY column',
      searchMock
    )) as ESQLQueryToOptionsSuccess;
    expect(esqlQueryToOptions.isSuccess(result)).toBe(true);
    expect('columns' in result).toBe(false);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "options": Array [
          "option1",
          "option2",
        ],
      }
    `);
  });
  it('returns columns and empty error on successful query that returns multiple columns', async () => {
    mockGetESQLResults.mockResolvedValueOnce({
      response: {
        columns: [{ name: 'column1' }, { name: 'column2' }],
        values: [['option1'], ['option2']],
      },
    });
    const result = (await esqlQueryToOptions(
      'FROM index',
      searchMock
    )) as ESQLQueryToOptionsFailure;
    expect(esqlQueryToOptions.isSuccess(result)).toBe(false);
    expect('options' in result).toBe(false);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "column1",
          "column2",
        ],
        "errors": Array [],
      }
    `);
  });
  it('returns an error on a failed query', async () => {
    mockGetESQLResults.mockRejectedValueOnce('Invalid ES|QL query');
    const result = (await esqlQueryToOptions(
      "now this is the story all about how my life got flipped-turned upside down and i'd like to take a minute just sit right there i'll tell you how i became the prince of a town called bel air",
      searchMock
    )) as ESQLQueryToOptionsFailure;
    expect(esqlQueryToOptions.isSuccess(result)).toBe(false);
    expect('options' in result).toBe(false);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [],
        "errors": Array [
          "Invalid ES|QL query",
        ],
      }
    `);
  });
});
