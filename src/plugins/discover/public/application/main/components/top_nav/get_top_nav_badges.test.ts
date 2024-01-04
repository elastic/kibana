/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTopNavBadges } from './get_top_nav_badges';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';

const stateContainer = getDiscoverStateMock({ isTimeBased: true });

describe('getTopNavBadges()', function () {
  test('should not return the unsaved changes badge if no changes', () => {
    const topNavBadges = getTopNavBadges({
      hasUnsavedChanges: false,
      services: discoverServiceMock,
      stateContainer,
      topNavCustomization: undefined,
    });
    expect(topNavBadges).toMatchInlineSnapshot(`Array []`);
  });

  test('should return the unsaved changes badge when has changes', () => {
    const topNavBadges = getTopNavBadges({
      hasUnsavedChanges: true,
      services: discoverServiceMock,
      stateContainer,
      topNavCustomization: undefined,
    });
    expect(topNavBadges).toMatchInlineSnapshot(`
      Array [
        Object {
          "badgeText": "Unsaved changes",
          "renderCustomBadge": [Function],
        },
      ]
    `);
  });

  test('should not return the unsaved changes badge when disabled in customization', () => {
    const topNavBadges = getTopNavBadges({
      hasUnsavedChanges: true,
      services: discoverServiceMock,
      stateContainer,
      topNavCustomization: {
        id: 'top_nav',
        defaultBadges: {
          unsavedChangesBadge: {
            disabled: true,
          },
        },
      },
    });
    expect(topNavBadges).toMatchInlineSnapshot(`Array []`);
  });

  test('should allow to render additional badges when customized', () => {
    const topNavBadges = getTopNavBadges({
      hasUnsavedChanges: true,
      services: discoverServiceMock,
      stateContainer,
      topNavCustomization: {
        id: 'top_nav',
        getBadges: () => {
          return [
            {
              data: {
                badgeText: 'test10',
              },
              order: 10,
            },
            {
              data: {
                badgeText: 'test200',
              },
              order: 200,
            },
          ];
        },
      },
    });
    expect(topNavBadges).toMatchInlineSnapshot(`
      Array [
        Object {
          "badgeText": "test10",
        },
        Object {
          "badgeText": "Unsaved changes",
          "renderCustomBadge": [Function],
        },
        Object {
          "badgeText": "test200",
        },
      ]
    `);
  });
});
