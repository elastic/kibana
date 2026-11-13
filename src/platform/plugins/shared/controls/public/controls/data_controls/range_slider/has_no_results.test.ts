/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { FilterableSource } from '@kbn/data-source';
import { dataViewsService } from '../../../services/kibana_services';
import { hasNoResults } from './has_no_results';

const mockGetESQLResults = jest.fn();
jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLResults: (...args: unknown[]) => mockGetESQLResults(...args),
}));

describe('hasNoResults', () => {
  const esqlSource: FilterableSource = {
    kind: 'esql',
    id: 'dataset-id',
    title: 'logs-*',
    fields: [{ name: 'bytes', type: 'number' }],
    getFieldByName: () => undefined,
    isTimeBased: () => false,
  };
  const rangeFilter = {
    meta: { type: 'range', key: 'bytes', params: { gte: 1, lte: 5 } },
    query: { range: { bytes: { gte: 1, lte: 5 } } },
  } as unknown as Filter;

  beforeEach(() => {
    jest.clearAllMocks();
    dataViewsService.get = jest.fn();
  });

  it('is false when the FROM target of an ES|QL source has a document in the range', async () => {
    mockGetESQLResults.mockResolvedValue({ response: { values: [['a']] } });

    const result = await hasNoResults({
      abortSignal: new AbortController().signal,
      dataSource: esqlSource,
      rangeFilter,
    });

    expect(result).toBe(false);
    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery: 'FROM logs-* | LIMIT 1',
        filter: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([{ range: { bytes: { gte: 1, lte: 5 } } }]),
          }),
        }),
      })
    );
    expect(dataViewsService.get).not.toHaveBeenCalled();
  });

  it('is true when the range has no documents', async () => {
    mockGetESQLResults.mockResolvedValue({ response: { values: [] } });

    expect(
      await hasNoResults({
        abortSignal: new AbortController().signal,
        dataSource: esqlSource,
        rangeFilter,
      })
    ).toBe(true);
  });
});
