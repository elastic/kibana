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
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';

const stateContainer = getDiscoverStateMock({ isTimeBased: true });
const discoverServiceMock = createDiscoverServicesMock();
discoverServiceMock.capabilities.discover_v2.save = true;

describe('getTopNavBadges()', function () {
  describe('managed saved search', () => {
    const stateContainerWithManagedSavedSearch = getDiscoverStateMock({
      savedSearch: { ...savedSearchMock, managed: true },
    });

    test('should return the managed badge when managed saved search', () => {
      const topNavBadges = getTopNavBadges({
        isMobile: false,
        services: discoverServiceMock,
        stateContainer: stateContainerWithManagedSavedSearch,
      });

      expect(topNavBadges).toHaveLength(1);
      expect(topNavBadges[0].badgeText).toEqual('Managed');
    });
  });

  describe('solutions view badge', () => {
    const discoverServiceWithSpacesMock = createDiscoverServicesMock();
    discoverServiceWithSpacesMock.capabilities.discover_v2.save = true;
    discoverServiceWithSpacesMock.spaces = spacesPluginMock.createStartContract();

    test('should return the solutions view badge when spaces is enabled', () => {
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
