/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsQuerySortValue, SearchRequest } from '../..';
import { queryToFields, SortDirection } from '../..';
import type { DataViewLazy } from '@kbn/data-views-plugin/common';
import { type Filter, FILTERS } from '@kbn/es-query';

describe('SearchSource#queryToFields', () => {
  it('should include time field', async () => {
    const dataView = {
      timeFieldName: '@timestamp',
      getSourceFiltering: jest.fn(),
      getFields: jest.fn().mockResolvedValue({
        getFieldMapSorted: jest.fn(),
      }),
    };
    const request: SearchRequest = { query: [] };
    await queryToFields({ dataView: dataView as unknown as DataViewLazy, request });
    const { fieldName } = dataView.getFields.mock.calls[0][0];
    expect(fieldName).toEqual(['@timestamp']);
  });

  it('should include sort field', async () => {
    const dataView = {
      getSourceFiltering: jest.fn(),
      getFields: jest.fn().mockResolvedValue({
        getFieldMapSorted: jest.fn(),
      }),
    };
    const sort: EsQuerySortValue = { bytes: SortDirection.asc };
    const request: SearchRequest = { query: [] };
    await queryToFields({ dataView: dataView as unknown as DataViewLazy, sort, request });
    const { fieldName } = dataView.getFields.mock.calls[0][0];
    expect(fieldName).toEqual(['bytes']);
  });

  it('should include request KQL query fields', async () => {
    const dataView = {
      timeFieldName: '@timestamp',
      getSourceFiltering: jest.fn(),
      getFields: jest.fn().mockResolvedValue({
        getFieldMapSorted: jest.fn(),
      }),
    };
    const request: SearchRequest = {
      query: [
        {
          language: 'kuery',
          query: 'log.level: debug AND NOT message: unknown',
        },
      ],
    };
    await queryToFields({ dataView: dataView as unknown as DataViewLazy, request });
    const { fieldName } = dataView.getFields.mock.calls[0][0];
    expect(fieldName).toEqual(['@timestamp', 'log.level', 'message']);
  });

  it('should not include request Lucene query fields', async () => {
    const dataView = {
      timeFieldName: '@timestamp',
      getSourceFiltering: jest.fn(),
      getFields: jest.fn().mockResolvedValue({
        getFieldMapSorted: jest.fn(),
      }),
    };
    const request: SearchRequest = {
      query: [
        {
          language: 'lucene',
          query: 'host: artifacts\\.*',
        },
      ],
    };
    await queryToFields({ dataView: dataView as unknown as DataViewLazy, request });
    const { fieldName } = dataView.getFields.mock.calls[0][0];
    expect(fieldName).toEqual(['@timestamp']);
  });

  it('should include fields from nested combined filters', async () => {
    const dataView = {
      getSourceFiltering: jest.fn().mockReturnValue({ excludes: [] }),
      getFields: jest.fn().mockResolvedValue({
        getFieldMapSorted: jest.fn(),
      }),
    };

    const combinedFilter: Filter = {
      meta: {
        type: FILTERS.COMBINED,
        disabled: false,
        params: [
          {
            meta: { disabled: false },
            query: {
              exists: { field: 'process.name' },
            },
          } as Filter,
          {
            meta: {
              type: FILTERS.COMBINED,
              disabled: false,
              params: [
                {
                  meta: { key: 'attributes.process.name', disabled: false },
                } as Filter,
                {
                  meta: { disabled: false },
                  query: {
                    exists: { field: 'stream.name' },
                  },
                } as Filter,
              ],
            },
          } as Filter,
        ],
      },
    } as Filter;

    const request: SearchRequest = {
      query: [],
      filters: [combinedFilter],
    };

    await queryToFields({ dataView: dataView as unknown as DataViewLazy, request });

    const { fieldName } = dataView.getFields.mock.calls[0][0];
    expect(fieldName).toEqual(['process.name', 'attributes.process.name', 'stream.name']);
  });
});
