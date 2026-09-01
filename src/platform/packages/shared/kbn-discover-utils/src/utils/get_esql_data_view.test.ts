/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import { TIMEFIELD_ROUTE } from '@kbn/esql-types';
import { getEsqlDataView } from './get_esql_data_view';
import { dataViewMock } from '../__mocks__';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { cpsPluginMock } from '@kbn/cps/public/mocks';

const dataViewAdHoc = {
  id: 'ad-hoc-id',
  title: 'data-view-ad-hoc-title',
  name: 'ES|QL ad-hoc data view',
  isPersisted: () => false,
  getIndexPattern: () => 'data-view-ad-hoc-title',
  timeFieldName: '@timestamp',
} as unknown as DataView;

const mockDataViewsService = dataViewPluginMocks.createStartContract();
jest.mocked(mockDataViewsService.create).mockImplementation((spec) => {
  return Promise.resolve({
    ...dataViewMock,
    isPersisted: () => false,
    id: 'ad-hoc-id',
    title: 'test',
    timeFieldName: spec.timeFieldName,
  } as DataView);
});

describe('getEsqlDataView', () => {
  const dataViewAdHocNoAtTimestamp = {
    ...dataViewAdHoc,
    timeFieldName: undefined,
  } as DataView;

  const services = {
    dataViews: mockDataViewsService,
    http: {
      post: jest.fn().mockResolvedValue({}),
    } as unknown as HttpStart,
    cps: cpsPluginMock.createStartContract(),
  };

  const mockGetTimeFieldRoute = (query: string, timeFieldResponse: string) => {
    const originalHttpPost = services.http.post;
    services.http.post = jest
      .fn()
      .mockImplementation((url: string, options?: { body?: string }) => {
        const body = options?.body ? JSON.parse(options.body) : undefined;
        if (url === TIMEFIELD_ROUTE && body?.query === query) {
          return Promise.resolve({ timeField: timeFieldResponse });
        }
        return Promise.resolve('');
      });
    return originalHttpPost;
  };

  it('returns the current dataview if it is adhoc with no named params and query index pattern is the same as the dataview index pattern', async () => {
    const query = { esql: 'from data-view-ad-hoc-title' };
    jest.mocked(services.cps.cpsManager!.getProjectRouting).mockReturnValue('_alias:_origin');

    const savedCreate = services.dataViews.create;
    const savedPost = services.http.post;

    // First call creates the DataView and registers it in the routing WeakMap
    const createdDataView = { ...dataViewAdHocNoAtTimestamp };
    services.dataViews.create = jest.fn().mockResolvedValue(createdDataView);
    services.http.post = jest.fn().mockResolvedValue({});
    const firstDataView = await getEsqlDataView(query, undefined, services);

    // Second call: same query + same routing → must return the same instance with no I/O
    jest.mocked(services.dataViews.create).mockClear();
    jest.mocked(services.http.post).mockClear();
    const dataView = await getEsqlDataView(query, firstDataView, services);

    expect(dataView).toBe(firstDataView);
    expect(services.http.post).not.toHaveBeenCalled();
    expect(services.dataViews.create).not.toHaveBeenCalled();

    services.dataViews.create = savedCreate;
    services.http.post = savedPost;
  });

  it('returns an adhoc dataview if it is adhoc with named params and query index pattern is the same as the dataview index pattern', async () => {
    const query = { esql: 'from data-view-ad-hoc-title | where time >= ?_tstart' };

    mockGetTimeFieldRoute(query.esql, 'time');

    const dataView = await getEsqlDataView(query, dataViewAdHocNoAtTimestamp, services);
    expect(dataView.timeFieldName).toBe('time');
  });

  it('creates an adhoc dataview if the current dataview is persistent and query index pattern is the same as the dataview index pattern', async () => {
    const query = { esql: 'from the-data-view-title' };

    mockGetTimeFieldRoute(query.esql, '@timestamp');

    const dataView = await getEsqlDataView(query, dataViewMock, services);
    expect(dataView.isPersisted()).toEqual(false);
    expect(dataView.timeFieldName).toBe('@timestamp');
  });

  it('creates an adhoc dataview if the current dataview is ad hoc and query index pattern is different from the dataview index pattern', async () => {
    services.dataViews.create = jest.fn().mockReturnValue({
      ...dataViewAdHoc,
      isPersisted: () => false,
      id: 'ad-hoc-id-1',
      title: 'test-1',
      timeFieldName: undefined,
    });
    const query = { esql: 'from the-data-view-title' };
    const dataView = await getEsqlDataView(query, dataViewAdHoc, services);
    expect(dataView.isPersisted()).toEqual(false);
    expect(dataView.timeFieldName).toBeUndefined();
  });

  it('creates an adhoc ES|QL dataview if the query doesnt have from command', async () => {
    services.dataViews.create = jest.fn().mockReturnValue({
      ...dataViewAdHoc,
      isPersisted: () => false,
      id: 'ad-hoc-id-1',
      title: 'test-1',
      timeFieldName: undefined,
    });
    const query = { esql: 'ROW x = "ES|QL is awesome"' };
    const dataView = await getEsqlDataView(query, dataViewAdHoc, services);
    expect(dataView.isPersisted()).toEqual(false);
    expect(dataView.name).toEqual(dataViewAdHoc.name);
    expect(dataView.timeFieldName).toBeUndefined();
  });

  it('creates a different data view when project routing changes for the same query', async () => {
    const query = { esql: 'from routing-aware-data-view' };
    services.dataViews.create = jest.fn().mockImplementation((spec) =>
      Promise.resolve({
        ...dataViewAdHoc,
        id: spec.id,
        title: spec.title,
        getIndexPattern: () => spec.title,
        timeFieldName: spec.timeFieldName,
      })
    );
    services.http.post = jest.fn().mockResolvedValue({ timeField: '@timestamp' });
    const getProjectRouting = jest
      .mocked(services.cps.cpsManager!.getProjectRouting)
      .mockReturnValue('_alias:_origin');

    const originDataView = await getEsqlDataView(query, undefined, services);
    getProjectRouting.mockReturnValue('_alias:*');
    const allProjectsDataView = await getEsqlDataView(query, originDataView, services);

    expect(allProjectsDataView.id).not.toBe(originDataView.id);
    expect(services.http.post).toHaveBeenCalledTimes(2);
  });
});
