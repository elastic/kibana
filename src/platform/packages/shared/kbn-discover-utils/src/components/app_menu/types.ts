/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { TopNavMenuData } from '@kbn/navigation-plugin/public';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';

export interface AppMenuControlOnClickParams {
  anchorElement: HTMLElement;
  onFinishAction: () => void;
}

export type AppMenuControlProps = Pick<
  TopNavMenuData,
  'testId' | 'isLoading' | 'label' | 'description' | 'disableButton' | 'href' | 'tooltip'
> & {
  onClick:
    | ((params: AppMenuControlOnClickParams) => Promise<React.ReactNode | void>)
    | ((params: AppMenuControlOnClickParams) => React.ReactNode | void)
    | undefined;
};

export type AppMenuControlWithIconProps = AppMenuControlProps & {
  iconType: EuiIconType;
};

interface ControlWithOptionalIcon {
  iconType?: EuiIconType;
}

export enum AppMenuActionId {
  new = 'new',
  open = 'open',
  share = 'share',
  alerts = 'alerts',
  inspect = 'inspect',
  createRule = 'createRule',
  manageRulesAndConnectors = 'manageRulesAndConnectors',
}

export enum AppMenuActionType {
  primary = 'primary',
  secondary = 'secondary',
  custom = 'custom',
  submenuHorizontalRule = 'submenuHorizontalRule',
}

export interface AppMenuActionBase {
  readonly id: AppMenuActionId | string;
  readonly order?: number | undefined;
}

/**
 * A secondary menu action
 */
export interface AppMenuActionSecondary extends AppMenuActionBase {
  readonly type: AppMenuActionType.secondary;
  readonly controlProps: AppMenuControlProps;
}

/**
 * A secondary submenu action
 */
export interface AppMenuSubmenuActionSecondary
  extends Omit<AppMenuActionSecondary, 'controlProps'> {
  readonly controlProps: AppMenuControlProps & ControlWithOptionalIcon;
}

/**
 * A custom menu action
 */
export interface AppMenuActionCustom extends AppMenuActionBase {
  readonly type: AppMenuActionType.custom;
  readonly controlProps: AppMenuControlProps;
}

/**
 * A custom submenu action
 */
export interface AppMenuSubmenuActionCustom extends Omit<AppMenuActionCustom, 'controlProps'> {
  readonly controlProps: AppMenuControlProps & ControlWithOptionalIcon;
}

/**
 * A primary menu action (with icon only)
 */
export interface AppMenuActionPrimary extends AppMenuActionBase {
  readonly type: AppMenuActionType.primary;
  readonly controlProps: AppMenuControlWithIconProps;
}

/**
 * A horizontal rule between menu items
 */
export interface AppMenuSubmenuHorizontalRule extends AppMenuActionBase {
  readonly type: AppMenuActionType.submenuHorizontalRule;
  readonly testId?: TopNavMenuData['testId'];
}

/**
 * A menu action which opens a submenu with more actions
 */
export interface AppMenuActionSubmenuBase<T = AppMenuActionSecondary | AppMenuActionCustom>
  extends AppMenuActionBase {
  readonly type: T extends AppMenuActionSecondary
    ? AppMenuActionType.secondary
    : AppMenuActionType.custom;
  readonly label: TopNavMenuData['label'];
  readonly description?: TopNavMenuData['description'];
  readonly testId?: TopNavMenuData['testId'];
  readonly actions: T extends AppMenuActionSecondary
    ? Array<
        AppMenuSubmenuActionSecondary | AppMenuSubmenuActionCustom | AppMenuSubmenuHorizontalRule
      >
    : Array<AppMenuSubmenuActionCustom | AppMenuSubmenuHorizontalRule>;
}

/**
 * A menu action which opens a submenu with more secondary actions
 */
export type AppMenuActionSubmenuSecondary = AppMenuActionSubmenuBase<AppMenuActionSecondary>;
/**
 * A menu action which opens a submenu with more custom actions
 */
export type AppMenuActionSubmenuCustom = AppMenuActionSubmenuBase<AppMenuActionCustom>;

/**
 * A primary menu item can only have an icon
 */
export type AppMenuItemPrimary = AppMenuActionPrimary;
/**
 * A secondary menu item can have only a label or a submenu
 */
export type AppMenuItemSecondary = AppMenuActionSecondary | AppMenuActionSubmenuSecondary;
/**
 * A custom menu item can have only a label or a submenu
 */
export type AppMenuItemCustom = AppMenuActionCustom | AppMenuActionSubmenuCustom;
/**
 * A menu item can be primary, secondary or custom
 */
export type AppMenuItem = AppMenuItemPrimary | AppMenuItemSecondary | AppMenuItemCustom;
