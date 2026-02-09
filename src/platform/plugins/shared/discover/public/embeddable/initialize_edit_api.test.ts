/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/common';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';

import { dataViewAdHoc } from '../__mocks__/data_view_complex';
import { discoverServiceMock } from '../__mocks__/services';
import { getAppTarget, initializeEditApi } from './initialize_edit_api';
import { getDiscoverLocatorParams } from './utils/get_discover_locator_params';
import { getMockedSearchApi } from './__mocks__/get_mocked_api';

describe('initialize edit api', () => {
  const searchSource = createSearchSourceMock({ index: dataViewMock });
  const savedSearch = {
    id: 'mock-id',
    title: 'saved search',
    sort: [['message', 'asc']] as Array<[string, string]>,
    searchSource,
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    managed: false,
  };

  const { api: mockedApi } = getMockedSearchApi({ searchSource, savedSearch });

  const waitOneTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  describe('get app target', () => {
    const runEditLinkTest = async (dataViewInput?: DataView, byValue?: boolean) => {
      const currentDataView = dataViewInput || dataViewMock;
      // Determine if the current scenario will use a redirect
      const currentSavedObjectId = byValue ? undefined : 'test-id';
      const isDataViewPersisted = currentDataView.isPersisted
        ? currentDataView.isPersisted()
        : true; // Assume persisted if method undefined
      const useRedirect = !currentSavedObjectId && !isDataViewPersisted;

      if (useRedirect) {
        // This is the "by value with ad hoc data view" (redirect) case.
        jest
          .spyOn(discoverServiceMock.locator, 'getUrl')
          .mockClear()
          .mockResolvedValueOnce('/base/state-url-for-redirect'); // For urlWithoutLocationState
        jest
          .spyOn(discoverServiceMock.locator, 'getLocation')
          .mockClear()
          .mockResolvedValueOnce({ app: 'r', path: '/state-url-for-redirect', state: {} })
          .mockResolvedValueOnce({ app: 'r', path: '/state-url-for-redirect', state: {} });
        jest
          .spyOn(discoverServiceMock.core.http.basePath, 'remove')
          .mockClear()
          .mockReturnValueOnce('/mock-url'); // For editPath (applied to getRedirectUrl result)
      } else {
        // This is a "by reference" or "by value with persisted data view" (non-redirect) case.
        jest
          .spyOn(discoverServiceMock.locator, 'getUrl')
          .mockClear()
          .mockResolvedValueOnce('/base/discover-home')
          .mockResolvedValueOnce('/base/mock-url'); // For getUrl(locatorParams) -> raw editUrl
        jest
          .spyOn(discoverServiceMock.core.http.basePath, 'remove')
          .mockClear()
          .mockReturnValueOnce('/mock-url'); // For remove('/base/mock-url') -> editPath
        jest
          .spyOn(discoverServiceMock.locator, 'getLocation')
          .mockClear()
          .mockResolvedValueOnce({ app: 'discover', path: '/discover-home', state: {} })
          .mockResolvedValueOnce({ app: 'discover', path: '/mock-url', state: {} });
      }

      mockedApi.dataViews$.next([currentDataView]);
      mockedApi.savedObjectId$.next(currentSavedObjectId);

      await waitOneTick();

      const { editPath, editUrl, urlWithoutLocationState } = await getAppTarget(
        mockedApi,
        discoverServiceMock
      );

      return { editPath, editUrl, urlWithoutLocationState };
    };

    const testByReferenceOrNonRedirectValue = ({
      editPath,
      editUrl,
      urlWithoutLocationState,
    }: {
      editPath: string;
      editUrl: string;
      urlWithoutLocationState: string;
    }) => {
      const locatorParams = getDiscoverLocatorParams(mockedApi);
      expect(discoverServiceMock.locator.getUrl).toHaveBeenCalledTimes(2);
      expect(discoverServiceMock.locator.getUrl).toHaveBeenCalledWith(locatorParams); // For raw editUrl
      expect(discoverServiceMock.locator.getUrl).toHaveBeenCalledWith({});

      expect(editPath).toBe('/mock-url'); // Result of getLocation().path
      expect(editUrl).toBe('/base/mock-url'); // Raw editUrl before basePath.remove
      expect(urlWithoutLocationState).toBe('/base/discover-home');
    };

    it('should correctly output edit link params for by reference saved search', async () => {
      const result = await runEditLinkTest(dataViewMock, false);
      testByReferenceOrNonRedirectValue(result);
    });

    it('should correctly output edit link params for by reference saved search with ad hoc data view', async () => {
      // Still "by reference" (savedObjectId exists), so no redirect even with ad-hoc data view.
      const result = await runEditLinkTest(dataViewAdHoc, false);
      testByReferenceOrNonRedirectValue(result);
    });

    it('should correctly output edit link params for by value saved search (with persisted data view)', async () => {
      // "by value" but with a persisted data view (dataViewMock), so no redirect.
      const result = await runEditLinkTest(dataViewMock, true);
      testByReferenceOrNonRedirectValue(result);
    });

    it('should correctly output edit link params for by value saved search with ad hoc data view', async () => {
      // This specific test case mocks getRedirectUrl because it's unique to the redirect flow
      jest
        .spyOn(discoverServiceMock.locator, 'getRedirectUrl')
        .mockClear()
        .mockReturnValueOnce('/base/mock-url'); // This will be the raw editUrl

      const result = await runEditLinkTest(dataViewAdHoc, true);
      const { editPath, editUrl, urlWithoutLocationState } = result;

      const locatorParams = getDiscoverLocatorParams(mockedApi);

      // Assertions for urlWithoutLocationState part (getUrl({}))
      expect(discoverServiceMock.locator.getUrl).toHaveBeenCalledTimes(1);
      expect(discoverServiceMock.locator.getUrl).toHaveBeenCalledWith({});

      // Assertions for redirect part
      expect(discoverServiceMock.locator.getRedirectUrl).toHaveBeenCalledTimes(1);
      expect(discoverServiceMock.locator.getRedirectUrl).toHaveBeenCalledWith(locatorParams);

      expect(editPath).toBe('/mock-url');
      expect(editUrl).toBe('/base/mock-url');
      expect(urlWithoutLocationState).toBe('/base/state-url-for-redirect');
    });
  });

  test('on edit calls `navigateToEditor`', async () => {
    const mockedNavigate = jest.fn();
    discoverServiceMock.embeddable.getStateTransfer = jest.fn().mockImplementation(() => ({
      navigateToEditor: mockedNavigate,
    }));
    mockedApi.dataViews$.next([dataViewMock]);
    mockedApi.savedObjectId$.next('test-id'); // Assuming a by-reference scenario for onEdit
    await waitOneTick();

    (discoverServiceMock.locator.getLocation as jest.Mock).mockReset().mockResolvedValueOnce({
      app: 'discover',
      path: '/mock-url-for-onedit',
      state: {},
    });

    const { onEdit } = initializeEditApi({
      uuid: 'test',
      parentApi: {
        getAppContext: jest.fn().mockReturnValue({
          getCurrentPath: jest.fn().mockReturnValue('/current-parent-path'),
          currentAppId: 'dashboard',
        }),
      },
      partialApi: mockedApi,
      isEditable: () => true,
      discoverServices: discoverServiceMock,
      getTitle: () => 'test-title',
    });

    await onEdit();
    expect(mockedNavigate).toBeCalledTimes(1);
    expect(mockedNavigate).toBeCalledWith('discover', {
      path: '/mock-url-for-onedit',
      state: expect.objectContaining({
        embeddableId: 'test',
        originatingApp: 'dashboard',
        originatingPath: '/current-parent-path',
      }),
    });
  });
});
