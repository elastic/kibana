/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esqlColumnValuesToOptionsListResponse } from './options_list_esql_response';

describe('esqlColumnValuesToOptionsListResponse', () => {
  const dateColumn = { name: 'day', type: 'date' as const };
  const dates = [
    '2024-02-01T00:00:00.000Z',
    '2024-01-15T00:00:00.000Z',
    '2024-01-15T00:00:00.000Z',
  ];
  const jan15 = Date.parse('2024-01-15T00:00:00.000Z');
  const feb1 = Date.parse('2024-02-01T00:00:00.000Z');

  it('has the values of a date column as timestamps, which is how a selection of them is stored', () => {
    const response = esqlColumnValuesToOptionsListResponse(
      { values: dates, column: dateColumn, indexPattern: 'logs-*' },
      { sort: { by: '_key', direction: 'asc' } }
    );

    expect(response.suggestions).toEqual([{ value: jan15 }, { value: feb1 }]);
  });

  it('searches the date in its text, and checks the selections as timestamps', () => {
    const response = esqlColumnValuesToOptionsListResponse(
      { values: dates, column: dateColumn, indexPattern: 'logs-*' },
      {
        searchString: '2024-02',
        searchTechnique: 'prefix',
        selectedOptions: [feb1, Date.parse('2020-01-01T00:00:00.000Z')],
      }
    );

    expect(response.suggestions).toEqual([{ value: feb1 }]);
    expect(response.invalidSelections).toEqual([Date.parse('2020-01-01T00:00:00.000Z')]);
  });

  it('has the values of the other columns as text', () => {
    const response = esqlColumnValuesToOptionsListResponse(
      { values: [10, 2], column: { name: 'bytes', type: 'long' }, indexPattern: 'logs-*' },
      {}
    );

    expect(response.suggestions).toEqual(expect.arrayContaining([{ value: '10' }, { value: '2' }]));
  });
});
