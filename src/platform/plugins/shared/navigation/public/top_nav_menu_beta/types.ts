/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonColor, EuiButtonProps, EuiHideForProps, IconType } from '@elastic/eui';
import type { SplitButtonWithNotificationProps } from '@kbn/split-button';

type BaseSplitProps = Pick<
  SplitButtonWithNotificationProps,
  | 'isMainButtonLoading'
  | 'isMainButtonDisabled'
  | 'isSecondaryButtonLoading'
  | 'isSecondaryButtonDisabled'
  | 'secondaryButtonAriaLabel'
  | 'secondaryButtonTitle'
  | 'secondaryButtonIcon'
  | 'iconType'
  | 'showNotificationIndicator'
  | 'notifcationIndicatorTooltipContent'
>;

export type TopNavMenuSplitButtonProps =
  // If `items` is provided then `run` shouldn't be, as having items means the button opens a popover
  | (BaseSplitProps & { items?: undefined; run: () => void })
  | (BaseSplitProps & { items: TopNavMenuPopoverItem[]; run?: never });

interface TopNavItemBase {
  id: string;
  htmlId?: string;
  label: string;
  iconType: IconType;
  testId?: string;
  disableButton?: boolean | (() => boolean);
  isLoading?: boolean;
  target?: string;
  href?: string;
  tooltipContent?: string | (() => string | undefined);
  tooltipTitle?: string | (() => string | undefined);
}

export type TopNavMenuItemCommon =
  // If `items` is provided then `run` shouldn't be, as having items means the button opens a popover
  | (TopNavItemBase & { run: () => void; items?: undefined; popoverWidth?: never; hidden?: never })
  | (TopNavItemBase & {
      run?: never;
      items: TopNavMenuPopoverItem[];
      popoverWidth?: number;
      hidden?: EuiHideForProps['sizes'];
    });

export type TopNavMenuItemType = TopNavMenuItemCommon & {
  order: number;
};

export type TopNavMenuPopoverItem = Omit<
  TopNavMenuItemType,
  'iconType' | 'hidden' | 'popoverWidth'
> & {
  iconType?: IconType;
  seperator?: 'above' | 'below';
};

export type TopNavMenuSecondaryActionItem = TopNavMenuItemCommon & {
  color?: EuiButtonColor;
  isFilled?: boolean;
  minWidth?: EuiButtonProps['minWidth'];
};

export type TopNavMenuPrimaryActionItem = Omit<TopNavMenuItemCommon, 'items'> & {
  splitButtonProps?: TopNavMenuSplitButtonProps;
};

export interface TopNavMenuConfigBeta {
  items?: TopNavMenuItemType[];
  secondaryActionItem?: TopNavMenuSecondaryActionItem;
  primaryActionItem?: TopNavMenuPrimaryActionItem;
}
