/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AppMenuActionPrimary,
  AppMenuActionSecondary,
  AppMenuActionSubmenuCustom,
  AppMenuActionType,
} from '@kbn/discover-utils';
import { convertAppMenuItemToTopNavItem } from './convert_to_top_nav_item';
import { discoverServiceMock } from '../../../../../__mocks__/services';

describe('convertAppMenuItemToTopNavItem', () => {
  it('should convert a primary AppMenuItem to TopNavMenuData', () => {
    const appMenuItem: AppMenuActionPrimary = {
      id: 'action-1',
      type: AppMenuActionType.primary,
      controlProps: {
        label: 'Action 1',
        testId: 'action-1',
        iconType: 'share',
        onClick: jest.fn(),
      },
    };

    const topNavItem = convertAppMenuItemToTopNavItem({
      appMenuItem,
      services: discoverServiceMock,
    });

    expect(topNavItem).toEqual({
      id: 'action-1',
      label: 'Action 1',
      description: 'Action 1',
      testId: 'action-1',
      run: expect.any(Function),
      iconType: 'share',
      iconOnly: true,
    });
  });

  it('should convert a secondary AppMenuItem to TopNavMenuData', () => {
    const appMenuItem: AppMenuActionSecondary = {
      id: 'action-2',
      type: AppMenuActionType.secondary,
      controlProps: {
        label: 'Action Secondary',
        testId: 'action-secondary',
        onClick: jest.fn(),
      },
    };

    const topNavItem = convertAppMenuItemToTopNavItem({
      appMenuItem,
      services: discoverServiceMock,
    });

    expect(topNavItem).toEqual({
      id: 'action-2',
      label: 'Action Secondary',
      description: 'Action Secondary',
      testId: 'action-secondary',
      run: expect.any(Function),
    });
  });

  it('should convert a custom AppMenuItem to TopNavMenuData', () => {
    const appMenuItem: AppMenuActionSubmenuCustom = {
      id: 'action-3',
      type: AppMenuActionType.custom,
      label: 'Action submenu',
      testId: 'action-submenu',
      actions: [
        {
          id: 'action-3-1',
          type: AppMenuActionType.custom,
          controlProps: {
            label: 'Action 3.1',
            testId: 'action-3-1',
            onClick: jest.fn(),
          },
        },
        {
          id: 'action-3-2',
          type: AppMenuActionType.submenuHorizontalRule,
        },
        {
          id: 'action-3-3',
          type: AppMenuActionType.custom,
          controlProps: {
            label: 'Action 3.3',
            testId: 'action-3-3',
            onClick: jest.fn(),
          },
        },
      ],
    };

    const topNavItem = convertAppMenuItemToTopNavItem({
      appMenuItem,
      services: discoverServiceMock,
    });

    expect(topNavItem).toEqual({
      id: 'action-3',
      label: 'Action submenu',
      description: 'Action submenu',
      testId: 'action-submenu',
      run: expect.any(Function),
    });
  });
});
