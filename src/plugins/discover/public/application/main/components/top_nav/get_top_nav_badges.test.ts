/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTopNavBadges } from './get_top_nav_badges';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const stateContainer = getDiscoverStateMock({ isTimeBased: true });
const discoverServiceMock = createDiscoverServicesMock();
discoverServiceMock.capabilities.discover.save = true;

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

    expect(topNavBadges).toHaveLength(1);
    const unsavedChangesBadge = topNavBadges[0];
    expect(unsavedChangesBadge.badgeText).toEqual('Unsaved changes');

    render(unsavedChangesBadge.renderCustomBadge!({ badgeText: 'Unsaved changes' }));
    userEvent.click(screen.getByRole('button')); // open menu
    expect(screen.queryByText('Save')).not.toBeNull();
    expect(screen.queryByText('Save as')).not.toBeNull();
    expect(screen.queryByText('Revert changes')).not.toBeNull();
  });

  test('should not show save in unsaved changed badge for read-only user', () => {
    const discoverServiceMockReadOnly = createDiscoverServicesMock();
    discoverServiceMockReadOnly.capabilities.discover.save = false;
    const topNavBadges = getTopNavBadges({
      hasUnsavedChanges: true,
      services: discoverServiceMockReadOnly,
      stateContainer,
      topNavCustomization: undefined,
    });

    expect(topNavBadges).toHaveLength(1);
    const unsavedChangesBadge = topNavBadges[0];
    expect(unsavedChangesBadge.badgeText).toEqual('Unsaved changes');

    render(unsavedChangesBadge.renderCustomBadge!({ badgeText: 'Unsaved changes' }));
    userEvent.click(screen.getByRole('button')); // open menu
    expect(screen.queryByText('Save')).toBeNull();
    expect(screen.queryByText('Save as')).toBeNull();
    expect(screen.queryByText('Revert changes')).not.toBeNull();
  });

  describe('managed saved search', () => {
    const stateContainerWithManagedSavedSearch = getDiscoverStateMock({
      savedSearch: { ...savedSearchMock, managed: true },
    });

    test('should return the managed badge when managed saved search', () => {
      const topNavBadges = getTopNavBadges({
        hasUnsavedChanges: false,
        services: discoverServiceMock,
        stateContainer: stateContainerWithManagedSavedSearch,
        topNavCustomization: undefined,
      });

      expect(topNavBadges).toHaveLength(1);
      expect(topNavBadges[0].badgeText).toEqual('Managed');
    });

    test('should not show save in unsaved changed badge', () => {
      const topNavBadges = getTopNavBadges({
        hasUnsavedChanges: true,
        services: discoverServiceMock,
        stateContainer: stateContainerWithManagedSavedSearch,
        topNavCustomization: undefined,
      });

      expect(topNavBadges).toHaveLength(2);
      const unsavedChangesBadge = topNavBadges[0];
      expect(unsavedChangesBadge.badgeText).toEqual('Unsaved changes');

      render(unsavedChangesBadge.renderCustomBadge!({ badgeText: 'Unsaved changes' }));
      userEvent.click(screen.getByRole('button')); // open menu
      expect(screen.queryByText('Save')).toBeNull();
    });
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
