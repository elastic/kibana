/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsQuerySortValue, queryToFields, SearchRequest, SortDirection } from '../..';
import { DataViewLazy } from '@kbn/data-views-plugin/common';

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
});
