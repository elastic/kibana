/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTopNavBadges } from './get_top_nav_badges';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fromSavedSearchToSavedObjectTab } from '../../state_management/redux';

const getStateContainer = async () => {
  const toolkit = getDiscoverInternalStateMock({ persistedDataViews: [dataViewMock] });
  await toolkit.initializeTabs();
  const { stateContainer } = await toolkit.initializeSingleTab({
    tabId: toolkit.getCurrentTab().id,
    skipWaitForDataFetching: true,
  });
  return stateContainer;
};

const discoverServiceMock = createDiscoverServicesMock();
discoverServiceMock.capabilities.discover_v2.save = true;

describe('getTopNavBadges()', function () {
  describe('managed saved search', () => {
    test('should return the managed badge when managed saved search', async () => {
      const services = createDiscoverServicesMock();
      services.capabilities.discover_v2.save = true;
      const toolkit = getDiscoverInternalStateMock({
        persistedDataViews: [dataViewMock],
        services,
      });
      const managedSavedSearch = { ...savedSearchMock, managed: true };
      const persistedDiscoverSession = {
        ...managedSavedSearch,
        id: managedSavedSearch.id ?? 'test-id',
        title: managedSavedSearch.title ?? 'title',
        description: managedSavedSearch.description ?? 'description',
        tabs: [
          fromSavedSearchToSavedObjectTab({
            tab: {
              id: managedSavedSearch.id ?? '',
              label: managedSavedSearch.title ?? '',
            },
            savedSearch: managedSavedSearch,
            services,
          }),
        ],
      };
      await toolkit.initializeTabs({ persistedDiscoverSession });
      const { stateContainer } = await toolkit.initializeSingleTab({
        tabId: toolkit.getCurrentTab().id,
        skipWaitForDataFetching: true,
      });
      const topNavBadges = getTopNavBadges({
        isMobile: false,
        services,
        stateContainer,
      });

      expect(topNavBadges).toHaveLength(1);
      expect(topNavBadges[0].badgeText).toEqual('Managed');
    });
  });

  describe('solutions view badge', () => {
    const discoverServiceWithSpacesMock = createDiscoverServicesMock();
    discoverServiceWithSpacesMock.capabilities.discover_v2.save = true;
    discoverServiceWithSpacesMock.spaces = spacesPluginMock.createStartContract();

    test('should return the solutions view badge when spaces is enabled', async () => {
      const stateContainer = await getStateContainer();
      const topNavBadges = getTopNavBadges({
        isMobile: false,
        services: discoverServiceWithSpacesMock,
        stateContainer,
      });
      expect(topNavBadges).toMatchInlineSnapshot(`
        Array [
          Object {
            "badgeText": "Check out context-aware Discover",
            "renderCustomBadge": [Function],
          },
        ]
      `);
    });
  });
});
