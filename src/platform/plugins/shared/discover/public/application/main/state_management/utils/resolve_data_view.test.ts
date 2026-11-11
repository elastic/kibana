/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import {
  canOpenWithoutPersistedDataViews,
  getInitialDataViewTarget,
  loadDataView,
} from './resolve_data_view';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { discoverServiceMock as services } from '../../../../__mocks__/services';
import { dataViewAdHoc } from '../../../../__mocks__/data_view_complex';
import { createDataViewDataSource } from '../../../../../common/data_sources';

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

  describe('getInitialDataViewTarget', () => {
    const initialAdHocDataViewSpec = { id: 'inline-data-view', title: 'logs-*' };

    test.each([
      ['the initial state', undefined, undefined, 'inline-data-view'],
      ['the saved tab over the initial state', undefined, dataViewMock, dataViewMock.id],
      [
        'the URL over the saved tab',
        createDataViewDataSource({ dataViewId: 'url-data-view' }),
        dataViewMock,
        'url-data-view',
      ],
    ])('targets %s', (_, dataSource, currentDataView, expectedDataViewId) => {
      expect(
        getInitialDataViewTarget({
          dataSource,
          initialDataViewIdOrSpec: initialAdHocDataViewSpec,
          currentDataView,
        })
      ).toEqual({ dataViewId: expectedDataViewId, initialAdHocDataViewSpec });
    });
  });

  describe('canOpenWithoutPersistedDataViews', () => {
    const adHocDataView = { ...dataViewAdHoc, id: 'ad-hoc-data-view' } as DataView;
    const withoutAlternatives = {
      isEsqlMode: false,
      locationStateHasDataViewSpec: false,
      dataViewId: 'ad-hoc-data-view',
      initialAdHocDataViewSpec: undefined,
      currentDataView: undefined,
      adHocDataViews: [],
      defaultProfileAdHocDataViewIds: [],
    };

    test.each([
      ['the initial ad hoc data view', { initialAdHocDataViewSpec: { id: 'ad-hoc-data-view' } }],
      ['an ad hoc data view on the saved tab', { currentDataView: adHocDataView }],
      [
        'a profile data view',
        { adHocDataViews: [adHocDataView], defaultProfileAdHocDataViewIds: ['ad-hoc-data-view'] },
      ],
    ])('opens with %s', (_, overrides) => {
      expect(canOpenWithoutPersistedDataViews({ ...withoutAlternatives, ...overrides })).toBe(true);
    });

    test('needs persisted data views otherwise', () => {
      expect(canOpenWithoutPersistedDataViews(withoutAlternatives)).toBe(false);
    });
  });
});
