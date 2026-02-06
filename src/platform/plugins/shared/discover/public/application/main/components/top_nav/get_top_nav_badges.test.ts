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
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { fromTabStateToSavedObjectTab } from '../../state_management/redux';
import { getTabStateMock } from '../../state_management/redux/__mocks__/internal_state.mocks';

const setup = async ({ managed = false } = {}) => {
  const services = createDiscoverServicesMock();
  services.capabilities.discover_v2.save = true;
  const toolkit = getDiscoverInternalStateMock({ services });
  const persistedDiscoverSession = managed
    ? createDiscoverSessionMock({
        id: 'test-id',
        managed: true,
        tabs: [
          fromTabStateToSavedObjectTab({
            tab: getTabStateMock({ id: 'test-tab' }),
            timeRestore: false,
            services,
          }),
        ],
      })
    : undefined;

  await toolkit.initializeTabs({ persistedDiscoverSession });

  const { stateContainer } = await toolkit.initializeSingleTab({
    tabId: toolkit.getCurrentTab().id,
  });

  return { stateContainer, services };
};

describe('getTopNavBadges()', function () {
  describe('managed saved search', () => {
    test('should return the managed badge when managed saved search', async () => {
      const { stateContainer, services } = await setup({ managed: true });
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
    test('should return the solutions view badge when spaces is enabled', async () => {
      const { stateContainer } = await setup();
      const servicesWithSpaces = createDiscoverServicesMock();
      servicesWithSpaces.capabilities.discover_v2.save = true;
      servicesWithSpaces.spaces = spacesPluginMock.createStartContract();

      const topNavBadges = getTopNavBadges({
        isMobile: false,
        services: servicesWithSpaces,
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
