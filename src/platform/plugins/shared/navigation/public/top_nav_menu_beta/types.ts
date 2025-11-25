/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonColor, IconType } from '@elastic/eui';
import type { SplitButtonProps } from '@kbn/split-button';
import type { TopNavMenuAction } from '../top_nav_menu/top_nav_menu_data';

export type TopNavMenuSplitButtonProps = Pick<
  SplitButtonProps,
  | 'isMainButtonLoading'
  | 'isMainButtonDisabled'
  | 'isSecondaryButtonLoading'
  | 'isSecondaryButtonDisabled'
  | 'secondaryButtonAriaLabel'
  | 'secondaryButtonTitle'
  | 'secondaryButtonIcon'
  | 'iconType'
> & {
  run: TopNavMenuAction;
};

export interface TopNavMenuItemCommonBeta {
  id?: string;
  htmlId?: string;
  label: string;
  iconType: IconType;
  run: TopNavMenuAction;
  testId?: string;
  disableButton?: boolean | (() => boolean);
  isLoading?: boolean;
  target?: string;
  href?: string;
  tooltip?: string | (() => string | undefined);
}

export interface TopNavMenuItemBetaType extends TopNavMenuItemCommonBeta {
  order: number;
  children?: TopNavMenuItemBetaType[];
}

export type TopNavMenuActionItemBeta = TopNavMenuItemCommonBeta;

export interface TopNavMenuSecondaryActionItemBeta extends TopNavMenuActionItemBeta {
  color?: EuiButtonColor;
}

export interface TopNavMenuPrimaryActionItemBeta extends TopNavMenuActionItemBeta {
  splitButtonProps?: TopNavMenuSplitButtonProps;
}

export interface TopNavMenuConfigBeta {
  items: TopNavMenuItemBetaType[];
  secondaryActionItem?: TopNavMenuSecondaryActionItemBeta;
  primaryActionItem?: TopNavMenuPrimaryActionItemBeta;
}

export interface RegisteredTopNavMenuDataBeta extends TopNavMenuItemBetaType {
  appName?: string;
}
