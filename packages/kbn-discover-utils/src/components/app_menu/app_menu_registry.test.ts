/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMenuRegistry } from './app_menu_registry';
import {
  AppMenuActionSubmenuSecondary,
  AppMenuActionType,
  AppMenuSubmenuActionCustom,
} from './types';

describe('AppMenuRegistry', () => {
  it('should initialize correctly', () => {
    const appMenuRegistry = initializeAppMenuRegistry();
    expect(appMenuRegistry.isActionRegistered('action-1')).toBe(true);
    expect(appMenuRegistry.isActionRegistered('action-2')).toBe(true);
    expect(appMenuRegistry.isActionRegistered('action-3')).toBe(true);
    expect(appMenuRegistry.isActionRegistered('action-3-1')).toBe(true);
    expect(appMenuRegistry.isActionRegistered('action-3-2')).toBe(true);
    expect(appMenuRegistry.isActionRegistered('action-n')).toBe(false);
    expect(appMenuRegistry.getSortedItems()).toHaveLength(3);
  });

  it('should allow to register custom actions', () => {
    const appMenuRegistry = initializeAppMenuRegistry();
    expect(appMenuRegistry.isActionRegistered('action-custom')).toBe(false);

    appMenuRegistry.registerCustomAction({
      id: 'action-custom',
      type: AppMenuActionType.custom,
      controlProps: {
        label: 'Action Custom',
        onClick: jest.fn(),
      },
    });

    appMenuRegistry.registerCustomAction({
      id: 'action-custom-submenu',
      type: AppMenuActionType.custom,
      label: 'Action Custom Submenu',
      actions: [
        {
          id: 'action-custom-submenu-1',
          type: AppMenuActionType.custom,
          controlProps: {
            label: 'Action Custom Submenu 1',
            onClick: jest.fn(),
          },
        },
      ],
    });

    expect(appMenuRegistry.isActionRegistered('action-custom')).toBe(true);
    expect(appMenuRegistry.isActionRegistered('action-custom-submenu')).toBe(true);
    expect(appMenuRegistry.getSortedItems()).toHaveLength(5);

    appMenuRegistry.registerCustomAction({
      id: 'action-custom-extra',
      type: AppMenuActionType.custom,
      controlProps: {
        label: 'Action Custom Extra',
        onClick: jest.fn(),
      },
    });

    // should limit the number of custom items
    const items = appMenuRegistry.getSortedItems();
    expect(items).toHaveLength(5);
    expect(items).toMatchSnapshot();
  });

  it('should allow to register custom actions under submenu', () => {
    const appMenuRegistry = initializeAppMenuRegistry();
    expect(appMenuRegistry.isActionRegistered('action-custom')).toBe(false);

    let items = appMenuRegistry.getSortedItems();
    let submenuItem = items.find((item) => item.id === 'action-3') as AppMenuActionSubmenuSecondary;
    expect(items).toHaveLength(3);
    expect(submenuItem.actions).toHaveLength(2);

    appMenuRegistry.registerCustomActionUnderSubmenu('action-3', {
      id: 'action-custom',
      type: AppMenuActionType.custom,
      order: 101,
      controlProps: {
        label: 'Action Custom',
        onClick: jest.fn(),
      },
    });

    expect(appMenuRegistry.isActionRegistered('action-custom')).toBe(true);

    items = appMenuRegistry.getSortedItems();
    expect(items).toHaveLength(3);

    // calling it again should not add a duplicate
    items = appMenuRegistry.getSortedItems();
    expect(items).toHaveLength(3);

    submenuItem = items.find((item) => item.id === 'action-3') as AppMenuActionSubmenuSecondary;
    expect(submenuItem.actions).toHaveLength(3);
    expect(items).toMatchSnapshot();
  });

  it('should allow to override actions under submenu', () => {
    const appMenuRegistry = initializeAppMenuRegistry();

    let items = appMenuRegistry.getSortedItems();
    expect(items).toHaveLength(3);

    let submenuItem = items.find((item) => item.id === 'action-3') as AppMenuActionSubmenuSecondary;
    const existingSecondaryActionId = submenuItem.actions[0].id;
    expect(submenuItem.actions).toHaveLength(2);

    expect(appMenuRegistry.isActionRegistered(existingSecondaryActionId)).toBe(true);

    const customAction: AppMenuSubmenuActionCustom = {
      id: existingSecondaryActionId, // using the same id to override the action with a custom one
      type: AppMenuActionType.custom,
      controlProps: {
        label: 'Action Custom',
        onClick: jest.fn(),
      },
    };
    appMenuRegistry.registerCustomActionUnderSubmenu('action-3', customAction);

    expect(appMenuRegistry.isActionRegistered(existingSecondaryActionId)).toBe(true);

    items = appMenuRegistry.getSortedItems();
    submenuItem = items.find((item) => item.id === 'action-3') as AppMenuActionSubmenuSecondary;
    expect(submenuItem.actions).toHaveLength(2);
    expect(submenuItem.actions.find((item) => item.id === existingSecondaryActionId)).toBe(
      customAction
    );
    expect(items).toMatchSnapshot();
  });
});

function initializeAppMenuRegistry() {
  return new AppMenuRegistry([
    {
      id: 'action-1',
      type: AppMenuActionType.primary,
      controlProps: {
        label: 'Action 1',
        iconType: 'bell',
        onClick: jest.fn(),
      },
    },
    {
      id: 'action-2',
      type: AppMenuActionType.secondary,
      controlProps: {
        label: 'Action 2',
        onClick: jest.fn(),
      },
    },
    {
      id: 'action-3',
      type: AppMenuActionType.secondary,
      label: 'Action 3',
      actions: [
        {
          id: 'action-3-1',
          type: AppMenuActionType.secondary,
          controlProps: {
            label: 'Action 3.1',
            iconType: 'heart',
            onClick: jest.fn(),
          },
        },
        {
          id: 'action-3-2',
          type: AppMenuActionType.secondary,
          controlProps: {
            label: 'Action 3.2',
            onClick: jest.fn(),
          },
        },
      ],
    },
  ]);
}
