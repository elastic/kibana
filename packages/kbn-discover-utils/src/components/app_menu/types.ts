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

export interface AppMenuControlOnClickParams {
  anchorElement: HTMLElement;
  onFinishAction: () => void;
  // some discover specific props?
}

export type AppMenuControlProps = Pick<
  TopNavMenuData,
  'testId' | 'isLoading' | 'label' | 'description' | 'disableButton' | 'href' | 'tooltip'
> & {
  onClick: (
    params: AppMenuControlOnClickParams
  ) => Promise<React.ReactNode | void> | React.ReactNode | void;
};

export type AppMenuIconControlProps = AppMenuControlProps & Pick<TopNavMenuData, 'iconType'>;

export enum AppMenuActionId {
  new = 'new',
  open = 'open',
  share = 'share',
  alerts = 'alerts',
  inspect = 'inspect',
}

export enum AppMenuActionType {
  primary = 'primary',
  secondary = 'secondary',
  custom = 'custom',
}

interface AppMenuActionBase {
  id: AppMenuActionId | string;
  order?: number;
}

export interface AppMenuPopoverAction extends AppMenuActionBase {
  type: AppMenuActionType.secondary | AppMenuActionType.custom;
  controlProps: AppMenuControlProps;
}

export interface AppMenuAction extends AppMenuActionBase {
  type: AppMenuActionType.secondary | AppMenuActionType.custom;
  controlProps: AppMenuControlProps;
}

export interface AppMenuIconAction extends AppMenuActionBase {
  type: AppMenuActionType.primary;
  controlProps: AppMenuIconControlProps;
}

export interface AppMenuPopoverActions extends AppMenuActionBase {
  label: string;
  type: AppMenuActionType.secondary | AppMenuActionType.custom;
  actions: AppMenuPopoverAction[];
}

export type AppMenuItem = AppMenuPopoverActions | AppMenuAction | AppMenuIconAction;
export type AppMenuItems = AppMenuItem[];
