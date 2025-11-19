/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonProps, EuiBetaBadgeProps, IconType } from '@elastic/eui';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { SplitButtonProps } from '@kbn/split-button';

export type TopNavMenuAction = (anchorElement: HTMLElement) => void;

export interface TopNavMenuData {
  id?: string;
  htmlId?: string;
  label: string;
  run: TopNavMenuAction;
  description?: string;
  testId?: string;
  className?: string;
  disableButton?: boolean | (() => boolean);
  tooltip?: string | (() => string | undefined);
  badge?: EuiBetaBadgeProps;
  emphasize?: boolean;
  fill?: boolean;
  color?: string;
  isLoading?: boolean;
  iconType?: IconType;
  iconSide?: EuiButtonProps['iconSide'];
  iconOnly?: boolean;
  target?: string;
  href?: string;
  intl?: InjectedIntl;
  splitButtonProps?: SplitButtonProps & {
    run: TopNavMenuAction;
  };
}

export interface RegisteredTopNavMenuData extends TopNavMenuData {
  appName?: string;
}

export type TopNavMenuSplitButtonProps = Pick<
  SplitButtonProps,
  | 'isMainButtonLoading'
  | 'isMainButtonDisabled'
  | 'isSecondaryButtonLoading'
  | 'isSecondaryButtonDisabled'
  | 'secondaryButtonAriaLabel'
  | 'secondaryButtonTitle'
  | 'iconType'
  | 'iconOnly'
> & {
  run: TopNavMenuAction;
};

export interface TopNavMenuItemCommonBeta {
  id?: string;
  htmlId?: string;
  label: string;
  run: TopNavMenuAction;
  testId?: string;
  disableButton?: boolean | (() => boolean);
  isLoading?: boolean;
  target?: string;
  href?: string;
}

export interface TopNavMenuItemBeta extends TopNavMenuItemCommonBeta {
  isExternalLink?: boolean;
}

export interface TopNavMenuActionItemBeta extends TopNavMenuItemCommonBeta {
  splitButtonProps?: TopNavMenuSplitButtonProps;
  iconType?: IconType;
}

export interface TopNavMenuDataBeta {
  items: TopNavMenuItemBeta[];
  actionItem?: TopNavMenuActionItemBeta;
}

export interface RegisteredTopNavMenuDataBeta extends TopNavMenuItemBeta {
  appName?: string;
}
