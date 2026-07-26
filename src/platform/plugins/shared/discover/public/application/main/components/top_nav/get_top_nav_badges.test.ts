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
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';

const discoverServiceMock = createDiscoverServicesMock();
discoverServiceMock.capabilities.discover_v2.save = true;

describe('getTopNavBadges()', function () {
  describe('managed discover session', () => {
    test('should return the managed badge when managed discover session', () => {
      const topNavBadges = getTopNavBadges({
        isMobile: false,
        isManaged: true,
        services: discoverServiceMock,
      });

      expect(topNavBadges).toHaveLength(1);
      expect(topNavBadges[0].badgeText).toEqual('Managed');
    });

    test('should not return the managed badge when not managed discover session', () => {
      const topNavBadges = getTopNavBadges({
        isMobile: false,
        isManaged: false,
        services: discoverServiceMock,
      });

      expect(topNavBadges).toHaveLength(0);
    });
  });

  describe('solutions view badge', () => {
    const discoverServiceWithSpacesMock = createDiscoverServicesMock();
    discoverServiceWithSpacesMock.capabilities.discover_v2.save = true;
    discoverServiceWithSpacesMock.spaces = spacesPluginMock.createStartContract();

    test('should return the solutions view badge when spaces is enabled', () => {
      const topNavBadges = getTopNavBadges({
        isMobile: false,
        isManaged: false,
        services: discoverServiceWithSpacesMock,
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
