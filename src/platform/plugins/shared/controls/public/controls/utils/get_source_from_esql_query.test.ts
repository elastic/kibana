/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSource, FilterableSource } from '@kbn/data-source';
import { BehaviorSubject } from 'rxjs';
import { EsqlSource } from '@kbn/data-source';
import type { DataView } from '@kbn/data-views-plugin/common';
import { coreServices, dataViewsService } from '../../services/kibana_services';
import { getSourceFromESQLQuery } from './get_source_from_esql_query';

const QUERY = 'FROM logs-* | STATS BY service.name';
const esqlSource: FilterableSource = {
  kind: 'esql',
  id: 'esql-dataset-id',
  title: 'logs-*',
  fields: [],
  getFieldByName: () => undefined,
  isTimeBased: () => false,
};

const esqlDataSource = { kind: 'esql', id: 'esql-dataset-id' } as EsqlSource;

const getDataViewOf = async (source: Promise<DataSource>) => {
  const resolved = await source;
  return resolved.kind === 'index-pattern' ? resolved.getDataView() : undefined;
};

describe('getSourceFromESQLQuery', () => {
  const mockForDataset = jest.spyOn(EsqlSource, 'forDataset');

  beforeEach(() => {
    jest.clearAllMocks();
    mockForDataset.mockResolvedValue(esqlDataSource);
  });

  it('returns a matching parent-published data view before checking saved data views', async () => {
    const publishedDataView = { id: 'published-data-view' } as DataView;
    dataViewsService.find = jest.fn();
    dataViewsService.get = jest.fn().mockResolvedValue(publishedDataView);
    const parentApi = {
      dataSources$: new BehaviorSubject<DataView[] | undefined>([
        { id: 'published-data-view', title: 'logs-*', getIndexPattern: () => 'logs-*' },
      ] as DataView[]),
    };

    await expect(getDataViewOf(getSourceFromESQLQuery(QUERY, { parentApi }))).resolves.toBe(
      publishedDataView
    );

    expect(dataViewsService.get).toHaveBeenCalledWith('published-data-view', false);
    expect(dataViewsService.find).not.toHaveBeenCalled();
    expect(mockForDataset).not.toHaveBeenCalled();
  });

  it('does not use a parent-published ES|QL source, which is not a data view, before the saved data view', async () => {
    const savedDataView = { id: 'saved-data-view' } as DataView;
    dataViewsService.get = jest.fn().mockImplementation(async (id: string) => {
      if (id === 'saved-data-view') return savedDataView;
      throw new Error('Saved object not found');
    });
    dataViewsService.find = jest.fn().mockResolvedValue([{ id: 'saved-data-view' }]);
    const parentApi = {
      dataSources$: new BehaviorSubject<FilterableSource[] | undefined>([esqlSource]),
    };

    await expect(getDataViewOf(getSourceFromESQLQuery(QUERY, { parentApi }))).resolves.toBe(
      savedDataView
    );

    expect(dataViewsService.get).toHaveBeenCalledWith('esql-dataset-id', false);
    expect(dataViewsService.find).toHaveBeenCalledWith('logs-*');
    expect(mockForDataset).not.toHaveBeenCalled();
  });

  it('returns the matching saved data view', async () => {
    const savedDataView = { id: 'saved-data-view' } as DataView;
    dataViewsService.find = jest.fn().mockResolvedValue([{ id: 'saved-data-view' }]);
    dataViewsService.get = jest.fn().mockResolvedValue(savedDataView);

    await expect(getDataViewOf(getSourceFromESQLQuery(QUERY))).resolves.toBe(savedDataView);

    expect(dataViewsService.find).toHaveBeenCalledWith('logs-*');
    expect(mockForDataset).not.toHaveBeenCalled();
  });

  it('returns an ES|QL source, with no ad hoc data view, when no saved data view matches', async () => {
    dataViewsService.find = jest.fn().mockResolvedValue([]);

    await expect(getSourceFromESQLQuery(QUERY)).resolves.toBe(esqlDataSource);

    expect(mockForDataset).toHaveBeenCalledWith({
      query: QUERY,
      http: coreServices.http,
      projectRouting: undefined,
    });
  });

  it('builds the ES|QL source with the project routing of the parent', async () => {
    dataViewsService.find = jest.fn().mockResolvedValue([]);
    const parentApi = { projectRouting$: new BehaviorSubject<string | undefined>('_alias:*') };

    await getSourceFromESQLQuery(QUERY, { parentApi });

    expect(mockForDataset).toHaveBeenCalledWith(
      expect.objectContaining({ projectRouting: '_alias:*' })
    );
  });
});
