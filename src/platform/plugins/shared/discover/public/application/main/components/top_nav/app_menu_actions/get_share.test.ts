/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { buildShareOptions } from './get_share';
import {
  getDiscoverInternalStateMock,
  type InternalStateMockToolkit,
} from '../../../../../__mocks__/discover_state.mock';
import { FetchStatus } from '../../../../types';
import { internalStateActions } from '../../../state_management/redux';

const mockDiscoverService = createDiscoverServicesMock();

describe('getShare', () => {
  let toolkit: InternalStateMockToolkit;

  beforeAll(async () => {
    toolkit = getDiscoverInternalStateMock({
      services: mockDiscoverService,
      persistedDataViews: [dataViewMock],
    });

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

    toolkit.internalState.dispatch(
      internalStateActions.setDataView({
        tabId: toolkit.getCurrentTab().id,
        dataView: dataViewMock,
      })
    );
  });

  it('should return the correct share options, without absolute time range set when in classic mode', async () => {
    const shareOptions = await buildShareOptions({
      services: mockDiscoverService,
      discoverParams: {
        dataView: dataViewMock,
        isEsqlMode: false,
        adHocDataViews: [],
        authorizedRuleTypeIds: [],
        actions: {
          updateAdHocDataViews: jest.fn(),
        },
      },
      currentTab: toolkit.getCurrentTab(),
      persistedDiscoverSession: undefined,
      totalHitsState: { result: 0, fetchStatus: FetchStatus.COMPLETE },
      hasUnsavedChanges: false,
    });

    expect(shareOptions).toEqual(
      expect.objectContaining({
        allowShortUrl: false,
        shareableUrl: 'http://localhost/',
        shareableUrlForSavedObject: '#?_g=()',
        sharingData: expect.objectContaining({
          isTextBased: false,
          absoluteTimeRange: undefined,
          locatorParams: expect.arrayContaining([
            expect.objectContaining({
              id: undefined,
              version: 'major.minor.patch',
              params: expect.objectContaining({
                timeRange: expect.objectContaining({
                  from: expect.any(String),
                  to: expect.any(String),
                }),
                dataViewId: dataViewMock.id,
              }),
            }),
          ]),
        }),
        objectId: undefined,
        objectType: 'search',
        objectTypeAlias: 'Discover session',
      })
    );
  });

  it('should return the correct share options, with absolute time range set when in ES|QL mode', async () => {
    const shareOptions = await buildShareOptions({
      services: mockDiscoverService,
      discoverParams: {
        dataView: dataViewMock,
        isEsqlMode: true,
        adHocDataViews: [],
        authorizedRuleTypeIds: [],
        actions: {
          updateAdHocDataViews: jest.fn(),
        },
      },
      currentTab: toolkit.getCurrentTab(),
      persistedDiscoverSession: undefined,
      totalHitsState: { result: 0, fetchStatus: FetchStatus.COMPLETE },
      hasUnsavedChanges: false,
    });

    expect(shareOptions).toEqual(
      expect.objectContaining({
        allowShortUrl: false,
        shareableUrl: 'http://localhost/',
        shareableUrlForSavedObject: '#?_g=()',
        sharingData: expect.objectContaining({
          isTextBased: true,
          absoluteTimeRange: expect.objectContaining({
            from: expect.any(String),
            to: expect.any(String),
          }),
          locatorParams: expect.arrayContaining([
            expect.objectContaining({
              id: undefined,
              version: 'major.minor.patch',
              params: expect.objectContaining({
                timeRange: expect.objectContaining({
                  from: expect.any(String),
                  to: expect.any(String),
                }),
                dataViewId: dataViewMock.id,
              }),
            }),
          ]),
        }),
        objectId: undefined,
        objectType: 'search',
        objectTypeAlias: 'Discover session',
      })
    );
  });
});
