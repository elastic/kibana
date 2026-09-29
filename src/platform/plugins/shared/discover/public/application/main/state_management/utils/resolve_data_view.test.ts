/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { generateInlineDataViewId } from '../../../../../common/session/inline_data_view';
import {
  createDiscoverServicesMock,
  discoverServiceMock as services,
} from '../../../../__mocks__/services';
import { loadDataView } from './resolve_data_view';

describe('Resolve data view tests', () => {
  test('returns valid data for an existing data view', async () => {
    const dataViewId = 'the-data-view-id';
    const result = await loadDataView({
      dataViewId,
      services,
      savedDataViews: [],
      adHocDataViews: [],
    });
    expect(result.loadedDataView).toEqual(dataViewMock);
    expect(result.requestedDataViewId).toEqual(dataViewId);
    expect(result.requestedDataViewFound).toEqual(true);
  });
  test('returns fallback data for an invalid data view', async () => {
    const dataViewId = 'invalid-id';
    const result = await loadDataView({
      dataViewId,
      services,
      savedDataViews: [],
      adHocDataViews: [],
    });
    expect(result.loadedDataView).toEqual(dataViewMock);
    expect(result.requestedDataViewFound).toBe(false);
    expect(result.requestedDataViewId).toBe(dataViewId);
  });
});

describe('loadDataView with inline specs', () => {
  const spec: DataViewSpec = { title: 'logs-*', timeFieldName: '@timestamp' };
  const derivedId = generateInlineDataViewId(spec);

  // Creates isolated services with the ID-based cache behavior used by DataViewsService.
  const setup = () => {
    const mockServices = createDiscoverServicesMock();
    const cache = new Map<string, DataView>();
    const create = jest
      .spyOn(mockServices.dataViews, 'create')
      .mockImplementation(async (input) => {
        const cached = input.id ? cache.get(input.id) : undefined;
        if (cached) {
          return cached;
        }
        const dataView = new DataView({ spec: input, fieldFormats: fieldFormatsMock });
        if (dataView.id) {
          cache.set(dataView.id, dataView);
        }
        return dataView;
      });
    const resolve = jest.spyOn(mockServices.inlineDataViews, 'resolve');
    const get = jest.spyOn(mockServices.dataViews, 'get');
    jest.spyOn(mockServices.dataViews, 'clearInstanceCache').mockImplementation((id) => {
      if (id) {
        cache.delete(id);
      } else {
        cache.clear();
      }
    });

    return { mockServices, cache, create, resolve, get };
  };

  afterEach(() => jest.restoreAllMocks());

  it('resolves a normalized local spec without evicting the cached view', async () => {
    const { mockServices, resolve, get } = setup();
    const initialAdHocDataViewSpec = { ...spec, id: derivedId };
    const resolved = new DataView({
      spec: initialAdHocDataViewSpec,
      fieldFormats: fieldFormatsMock,
    });
    resolve.mockResolvedValueOnce(resolved);

    const result = await loadDataView({
      dataViewId: derivedId,
      initialAdHocDataViewSpec,
      services: mockServices,
      savedDataViews: [],
      adHocDataViews: [],
    });

    expect(resolve).toHaveBeenCalledWith(initialAdHocDataViewSpec);
    expect(result).toEqual({
      loadedDataView: resolved,
      requestedDataViewId: derivedId,
      requestedDataViewFound: true,
    });
    expect(mockServices.dataViews.clearInstanceCache).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it('rebuilds a navigation view if an editor changed its cached instance in place', async () => {
    const { mockServices, cache, resolve, create } = setup();
    const cached = new DataView({
      spec: { ...spec, id: derivedId },
      fieldFormats: fieldFormatsMock,
    });
    cache.set(derivedId, cached);
    cached.setIndexPattern('other-*');
    const locationDataViewSpec = { ...spec, id: derivedId };

    const result = await loadDataView({
      locationDataViewSpec,
      services: mockServices,
      savedDataViews: [],
      adHocDataViews: [],
    });

    expect(mockServices.dataViews.clearInstanceCache).toHaveBeenCalledWith(derivedId);
    expect(create).toHaveBeenCalledWith(locationDataViewSpec);
    expect(resolve).not.toHaveBeenCalled();
    expect(result.loadedDataView).not.toBe(cached);
    expect(result.loadedDataView.id).toBe(derivedId);
    expect(result.loadedDataView.getIndexPattern()).toBe(spec.title);
    expect(cache.get(derivedId)).toBe(result.loadedDataView);
  });

  it('does not resolve a local spec for a different requested view', async () => {
    const { mockServices, resolve, get } = setup();

    await loadDataView({
      dataViewId: dataViewMock.id,
      initialAdHocDataViewSpec: { ...spec, id: 'other-id' },
      services: mockServices,
      savedDataViews: [],
      adHocDataViews: [],
    });

    expect(get).toHaveBeenCalledWith(dataViewMock.id);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('loads a persisted navigation view by ID without resolving its spec', async () => {
    const { mockServices, resolve, create, get } = setup();
    const savedDataView = { id: 'saved-id', title: 'saved-*' };
    get.mockResolvedValueOnce(dataViewMock);

    const result = await loadDataView({
      locationDataViewSpec: savedDataView,
      services: mockServices,
      savedDataViews: [savedDataView],
      adHocDataViews: [],
    });

    expect(get).toHaveBeenCalledWith(savedDataView.id);
    expect(resolve).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(result.loadedDataView).toBe(dataViewMock);
    expect(result.requestedDataViewId).toBe(savedDataView.id);
    expect(mockServices.dataViews.clearInstanceCache).not.toHaveBeenCalled();
  });

  it('propagates resolution failures without loading an unrelated default view', async () => {
    const { mockServices, resolve } = setup();
    const error = new Error('Cannot load inline view');
    resolve.mockRejectedValueOnce(error);

    await expect(
      loadDataView({
        dataViewId: derivedId,
        initialAdHocDataViewSpec: { ...spec, id: derivedId },
        services: mockServices,
        savedDataViews: [],
        adHocDataViews: [],
      })
    ).rejects.toBe(error);
    expect(mockServices.dataViews.getDefaultDataView).not.toHaveBeenCalled();
  });
});
