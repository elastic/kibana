/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableSource } from '@kbn/data-source';
import { BehaviorSubject } from 'rxjs';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { coreServices, dataViewsService } from '../../services/kibana_services';
import { getDataViewIdFromESQLQuery } from './get_data_view_id_from_esql_query';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLAdHocDataview: jest.fn(),
}));

const mockGetESQLAdHocDataview = getESQLAdHocDataview as jest.MockedFunction<
  typeof getESQLAdHocDataview
>;

describe('getDataViewIdFromESQLQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a matching parent-published data view id before checking saved data views', async () => {
    dataViewsService.find = jest.fn();
    dataViewsService.get = jest.fn().mockResolvedValue({ id: 'published-data-view' });
    const parentApi = {
      dataSources$: new BehaviorSubject<DataView[] | undefined>([
        { id: 'published-data-view', title: 'logs-*', getIndexPattern: () => 'logs-*' },
      ] as DataView[]),
    };

    await expect(
      getDataViewIdFromESQLQuery('FROM logs-* | STATS BY service.name', {
        parentApi,
      })
    ).resolves.toBe('published-data-view');

    expect(dataViewsService.get).toHaveBeenCalledWith('published-data-view', false);
    expect(dataViewsService.find).not.toHaveBeenCalled();
    expect(mockGetESQLAdHocDataview).not.toHaveBeenCalled();
  });

  it('does not use the id of a parent-published ES|QL source, which is not a data view', async () => {
    dataViewsService.get = jest.fn().mockRejectedValue(new Error('Saved object not found'));
    dataViewsService.find = jest.fn().mockResolvedValue([{ id: 'saved-data-view' }]);
    const esqlSource: FilterableSource = {
      id: 'esql-dataset-id',
      title: 'logs-*',
      fields: [],
      isTimeBased: () => false,
    };
    const parentApi = {
      dataSources$: new BehaviorSubject<FilterableSource[] | undefined>([esqlSource]),
    };

    await expect(
      getDataViewIdFromESQLQuery('FROM logs-* | STATS BY service.name', { parentApi })
    ).resolves.toBe('saved-data-view');

    expect(dataViewsService.get).toHaveBeenCalledWith('esql-dataset-id', false);
    expect(dataViewsService.find).toHaveBeenCalledWith('logs-*');
  });

  it('returns the matching saved data view id', async () => {
    dataViewsService.find = jest.fn().mockResolvedValue([{ id: 'saved-data-view' }]);

    await expect(getDataViewIdFromESQLQuery('FROM logs-* | STATS BY service.name')).resolves.toBe(
      'saved-data-view'
    );

    expect(dataViewsService.find).toHaveBeenCalledWith('logs-*');
    expect(mockGetESQLAdHocDataview).not.toHaveBeenCalled();
  });

  it('creates an ad hoc data view when no saved data view matches', async () => {
    dataViewsService.find = jest.fn().mockResolvedValue([]);
    mockGetESQLAdHocDataview.mockResolvedValue({
      id: 'ad-hoc-data-view',
    } as Awaited<ReturnType<typeof getESQLAdHocDataview>>);

    await expect(getDataViewIdFromESQLQuery('FROM logs-* | STATS BY service.name')).resolves.toBe(
      'ad-hoc-data-view'
    );

    expect(mockGetESQLAdHocDataview).toHaveBeenCalledWith({
      dataViewsService,
      query: 'FROM logs-* | STATS BY service.name',
      http: coreServices.http,
    });
  });
});
