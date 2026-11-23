/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlValuesSource } from '@kbn/controls-constants';
import { DataViewSource } from '@kbn/data-source';
import type { DataSource, FilterableSource } from '@kbn/data-source';
import type { DataView } from '@kbn/data-views-plugin/common';
import { dataViewsService } from '../../services/kibana_services';
import { getSourceFromESQLQuery } from './get_source_from_esql_query';
import { getDataViewOfSource, resolveControlSource } from './resolve_control_source';

jest.mock('./get_source_from_esql_query', () => ({ getSourceFromESQLQuery: jest.fn() }));

describe('resolveControlSource', () => {
  const mockGetSourceFromESQLQuery = getSourceFromESQLQuery as jest.MockedFunction<
    typeof getSourceFromESQLQuery
  >;
  const dataView = { id: 'myDataViewId' } as DataView;
  const esqlFilterableSource = { kind: 'esql', id: 'esql-dataset-id' } as FilterableSource;
  const esqlSource = {
    kind: 'esql',
    id: 'esql-dataset-id',
    toFilterableSource: jest.fn().mockResolvedValue(esqlFilterableSource),
  } as unknown as DataSource;

  beforeEach(() => {
    jest.clearAllMocks();
    dataViewsService.get = jest.fn().mockResolvedValue(dataView);
    mockGetSourceFromESQLQuery.mockResolvedValue(esqlSource);
  });

  it('loads the data view of a field, without reading any query', async () => {
    const { dataSource, filterableSource } = await resolveControlSource({
      values_source: ControlValuesSource.FIELD,
      data_view_id: 'myDataViewId',
    });

    expect(getDataViewOfSource(dataSource)).toBe(dataView);
    expect(filterableSource).toBe(dataView);
    expect(dataViewsService.get).toHaveBeenCalledWith('myDataViewId');
    expect(mockGetSourceFromESQLQuery).not.toHaveBeenCalled();
  });

  it('derives the source of a query from the query, without loading a data view by id', async () => {
    const parentApi = {};
    const { dataSource, filterableSource } = await resolveControlSource(
      { values_source: ControlValuesSource.ESQL, esql_query: 'FROM logs | STATS BY os' },
      { parentApi }
    );

    expect(dataSource).toBe(esqlSource);
    expect(filterableSource).toBe(esqlFilterableSource);
    expect(mockGetSourceFromESQLQuery).toHaveBeenCalledWith('FROM logs | STATS BY os', {
      parentApi,
    });
    expect(dataViewsService.get).not.toHaveBeenCalled();
  });

  it('fails for a query control without a query', async () => {
    await expect(
      resolveControlSource({ values_source: ControlValuesSource.ESQL, esql_query: '' })
    ).rejects.toThrow('Variable control is missing a query');
  });

  describe('getDataViewOfSource', () => {
    it('is the data view of a data source of a data view, and nothing for another kind of source', () => {
      expect(getDataViewOfSource(new DataViewSource(dataView))).toBe(dataView);
      expect(getDataViewOfSource(esqlSource)).toBeUndefined();
      expect(getDataViewOfSource(undefined)).toBeUndefined();
    });
  });
});
