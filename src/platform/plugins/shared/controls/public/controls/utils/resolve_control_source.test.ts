/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlValuesSource } from '@kbn/controls-constants';
import type { FilterableSource } from '@kbn/data-source';
import type { DataView } from '@kbn/data-views-plugin/common';
import { dataViewsService } from '../../services/kibana_services';
import { getSourceFromESQLQuery } from './get_source_from_esql_query';
import { resolveControlSource } from './resolve_control_source';

jest.mock('./get_source_from_esql_query', () => ({ getSourceFromESQLQuery: jest.fn() }));

describe('resolveControlSource', () => {
  const mockGetSourceFromESQLQuery = getSourceFromESQLQuery as jest.MockedFunction<
    typeof getSourceFromESQLQuery
  >;
  const esqlSource = { kind: 'esql', id: 'esql-dataset-id' } as FilterableSource;

  beforeEach(() => {
    jest.clearAllMocks();
    dataViewsService.get = jest.fn().mockResolvedValue({ id: 'myDataViewId' } as DataView);
    mockGetSourceFromESQLQuery.mockResolvedValue(esqlSource);
  });

  it('loads the data view of a field, without reading any query', async () => {
    const source = await resolveControlSource({
      valuesSource: ControlValuesSource.FIELD,
      dataViewId: 'myDataViewId',
    });

    expect(source).toEqual({ id: 'myDataViewId' });
    expect(dataViewsService.get).toHaveBeenCalledWith('myDataViewId');
    expect(mockGetSourceFromESQLQuery).not.toHaveBeenCalled();
  });

  it('derives the source of a query from the query, without loading a data view by id', async () => {
    const parentApi = {};
    const source = await resolveControlSource(
      { valuesSource: ControlValuesSource.ESQL, esqlQuery: 'FROM logs | STATS BY os' },
      { parentApi }
    );

    expect(source).toBe(esqlSource);
    expect(mockGetSourceFromESQLQuery).toHaveBeenCalledWith('FROM logs | STATS BY os', {
      parentApi,
    });
    expect(dataViewsService.get).not.toHaveBeenCalled();
  });

  it('fails for a query control without a query', async () => {
    await expect(
      resolveControlSource({ valuesSource: ControlValuesSource.ESQL, esqlQuery: '' })
    ).rejects.toThrow('Variable control is missing a query');
  });

  it('fails when the source of the query has no id', async () => {
    mockGetSourceFromESQLQuery.mockResolvedValue({ kind: 'esql' } as FilterableSource);

    await expect(
      resolveControlSource({ valuesSource: ControlValuesSource.ESQL, esqlQuery: 'FROM logs' })
    ).rejects.toThrow('Could not derive a data view from the ES|QL query');
  });
});
