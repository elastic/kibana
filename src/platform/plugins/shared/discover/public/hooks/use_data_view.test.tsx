/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { useDataView } from './use_data_view';
import { DiscoverTestProvider } from '../__mocks__/test_provider';
import type { DiscoverServices } from '../build_services';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { dataViewAdHoc } from '../__mocks__/data_view_complex';
import type { RootProfileState } from '../context_awareness';

const profileDataViewSpec = {
  id: 'profile-data-view',
  title: 'profile-data-view-title',
};

const loadedRootProfileState: RootProfileState = {
  rootProfileLoading: false,
  getDefaultAdHocDataViews: () => [profileDataViewSpec],
  getDefaultEsqlQuery: () => undefined,
};

describe('useDataView', () => {
  let services: DiscoverServices;

  const render = (
    index: string | DataViewSpec,
    rootProfileState: RootProfileState = loadedRootProfileState
  ) =>
    renderHook(() => useDataView({ index, rootProfileState }), {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <DiscoverTestProvider services={services}>{children}</DiscoverTestProvider>
      ),
    });

  beforeEach(() => {
    services = createDiscoverServicesMock();
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads a data view by ID', async () => {
    const get = jest.spyOn(services.dataViews, 'get').mockResolvedValueOnce(dataViewMock);
    const resolve = jest.spyOn(services.inlineDataViews, 'resolve');

    const { result } = render('the-data-view-id');

    await waitFor(() => expect(result.current.dataView).toBe(dataViewMock));
    expect(get).toHaveBeenCalledWith('the-data-view-id');
    expect(resolve).not.toHaveBeenCalled();
  });

  it('resolves a spec through the inline data view service', async () => {
    const spec: DataViewSpec = { id: 'inline-id', title: 'logs-*' };
    const resolve = jest
      .spyOn(services.inlineDataViews, 'resolve')
      .mockResolvedValueOnce(dataViewAdHoc);
    const get = jest.spyOn(services.dataViews, 'get');

    const { result } = render(spec);

    await waitFor(() => expect(result.current.dataView).toBe(dataViewAdHoc));
    expect(resolve).toHaveBeenCalledWith(spec);
    expect(get).not.toHaveBeenCalled();
  });

  it.each<[string, string | DataViewSpec]>([
    ['an ID', 'the-data-view-id'],
    ['a spec', { title: 'logs-*' }],
  ])('exposes the error when %s cannot be loaded', async (_description, index) => {
    const error = new Error('Cannot load');
    jest.spyOn(services.dataViews, 'get').mockRejectedValueOnce(error);
    jest.spyOn(services.inlineDataViews, 'resolve').mockRejectedValueOnce(error);

    const { result } = render(index);

    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current.dataView).toBeUndefined();
  });

  it('gets an ad hoc data view from the cache by ID', async () => {
    const get = jest.spyOn(services.dataViews, 'get').mockResolvedValueOnce(dataViewAdHoc);
    const { result } = render('cached-inline-id');

    await waitFor(() => expect(result.current.dataView).toBe(dataViewAdHoc));
    expect(get).toHaveBeenCalledWith('cached-inline-id');
    expect(services.dataViews.create).not.toHaveBeenCalled();
  });

  it('should create default profile ad hoc data view from the root profile spec', async () => {
    const get = jest.spyOn(services.dataViews, 'get');
    const create = jest.spyOn(services.dataViews, 'create').mockResolvedValueOnce(dataViewAdHoc);
    const { result } = render(profileDataViewSpec.id);

    await waitFor(() => expect(result.current.dataView).toBe(dataViewAdHoc));
    expect(get).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({ ...profileDataViewSpec, managed: true });
  });

  it('should wait for the root profile to load', () => {
    const get = jest.spyOn(services.dataViews, 'get');
    const resolve = jest.spyOn(services.inlineDataViews, 'resolve');
    const { result } = render(profileDataViewSpec.id, { rootProfileLoading: true });

    expect(get).not.toHaveBeenCalled();
    expect(services.dataViews.create).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
    expect(result.current.dataView).toBeUndefined();
  });
});
