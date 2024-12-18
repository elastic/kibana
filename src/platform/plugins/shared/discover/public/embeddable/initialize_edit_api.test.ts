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
    const runEditLinkTest = async (dataView?: DataView, byValue?: boolean) => {
      jest
        .spyOn(discoverServiceMock.locator, 'getUrl')
        .mockClear()
        .mockResolvedValueOnce('/base/mock-url');
      jest
        .spyOn(discoverServiceMock.core.http.basePath, 'remove')
        .mockClear()
        .mockReturnValueOnce('/mock-url');

      if (dataView) {
        mockedApi.dataViews.next([dataView]);
      } else {
        mockedApi.dataViews.next([dataViewMock]);
      }
      if (byValue) {
        mockedApi.savedObjectId.next(undefined);
      } else {
        mockedApi.savedObjectId.next('test-id');
      }
      await waitOneTick();

      const {
        path: editPath,
        app: editApp,
        editUrl,
      } = await getAppTarget(mockedApi, discoverServiceMock);

      return { editPath, editApp, editUrl };
    };

    const testByReference = ({
      editPath,
      editApp,
      editUrl,
    }: {
      editPath: string;
      editApp: string;
      editUrl: string;
    }) => {
      const locatorParams = getDiscoverLocatorParams(mockedApi);
      expect(discoverServiceMock.locator.getUrl).toHaveBeenCalledTimes(1);
      expect(discoverServiceMock.locator.getUrl).toHaveBeenCalledWith(locatorParams);
      expect(discoverServiceMock.core.http.basePath.remove).toHaveBeenCalledTimes(1);
      expect(discoverServiceMock.core.http.basePath.remove).toHaveBeenCalledWith('/base/mock-url');

      expect(editApp).toBe('discover');
      expect(editPath).toBe('/mock-url');
      expect(editUrl).toBe('/base/mock-url');
    };

    it('should correctly output edit link params for by reference saved search', async () => {
      const { editPath, editApp, editUrl } = await runEditLinkTest();
      testByReference({ editPath, editApp, editUrl });
    });

    it('should correctly output edit link params for by reference saved search with ad hoc data view', async () => {
      const { editPath, editApp, editUrl } = await runEditLinkTest(dataViewAdHoc);
      testByReference({ editPath, editApp, editUrl });
    });

    it('should correctly output edit link params for by value saved search', async () => {
      const { editPath, editApp, editUrl } = await runEditLinkTest(undefined, true);
      testByReference({ editPath, editApp, editUrl });
    });

    it('should correctly output edit link params for by value saved search with ad hoc data view', async () => {
      jest
        .spyOn(discoverServiceMock.locator, 'getRedirectUrl')
        .mockClear()
        .mockReturnValueOnce('/base/mock-url');
      jest
        .spyOn(discoverServiceMock.core.http.basePath, 'remove')
        .mockClear()
        .mockReturnValueOnce('/mock-url');

      const { editPath, editApp, editUrl } = await runEditLinkTest(dataViewAdHoc, true);

      const locatorParams = getDiscoverLocatorParams(mockedApi);
      expect(discoverServiceMock.locator.getRedirectUrl).toHaveBeenCalledTimes(1);
      expect(discoverServiceMock.locator.getRedirectUrl).toHaveBeenCalledWith(locatorParams);
      expect(discoverServiceMock.core.http.basePath.remove).toHaveBeenCalledTimes(1);
      expect(discoverServiceMock.core.http.basePath.remove).toHaveBeenCalledWith('/base/mock-url');

      expect(editApp).toBe('r');
      expect(editPath).toBe('/mock-url');
      expect(editUrl).toBe('/base/mock-url');
    });
  });

  test('on edit calls `navigateToEditor`', async () => {
    const mockedNavigate = jest.fn();
    discoverServiceMock.embeddable.getStateTransfer = jest.fn().mockImplementation(() => ({
      navigateToEditor: mockedNavigate,
    }));
    mockedApi.dataViews.next([dataViewMock]);
    await waitOneTick();

    const { onEdit } = initializeEditApi({
      uuid: 'test',
      parentApi: {
        getAppContext: jest.fn().mockResolvedValue({
          getCurrentPath: jest.fn(),
          currentAppId: 'dashboard',
        }),
      },
      partialApi: mockedApi,
      isEditable: () => true,
      discoverServices: discoverServiceMock,
    });

    await onEdit();
    expect(mockedNavigate).toBeCalledTimes(1);
    expect(mockedNavigate).toBeCalledWith('discover', {
      path: '/mock-url',
      state: expect.any(Object),
    });
  });
});
