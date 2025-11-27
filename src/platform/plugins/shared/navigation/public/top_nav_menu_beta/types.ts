/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonColor, IconType } from '@elastic/eui';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { SplitButtonWithNotificationProps } from '@kbn/split-button';
import type {
  StatefulSearchBarProps,
  UnifiedSearchPublicPluginStart,
} from '@kbn/unified-search-plugin/public';
import type { MountPoint } from '@kbn/core/public';
import type { TopNavMenuBadgeProps } from '../top_nav_menu/top_nav_menu_badges';

export type TopNavMenuPropsBeta<QT extends Query | AggregateQuery = Query> = Omit<
  StatefulSearchBarProps<QT>,
  'kibana' | 'intl' | 'timeHistory'
> & {
  config?: TopNavMenuConfigBeta;
  badges?: TopNavMenuBadgeProps[];
  showSearchBar?: boolean;
  showQueryInput?: boolean;
  showDatePicker?: boolean;
  showFilterBar?: boolean;
  unifiedSearch?: UnifiedSearchPublicPluginStart;
  visible?: boolean;
  /**
   * If provided, the menu part of the component will be rendered as a portal inside the given mount point.
   *
   * This is meant to be used with the `setHeaderActionMenu` core API.
   *
   * @example
   * ```ts
   * export renderApp = ({ element, history, setHeaderActionMenu }: AppMountParameters) => {
   *   const topNavConfig = ...; // TopNavMenuProps
   *   return (
   *     <Router history=history>
   *       <TopNavMenu {...topNavConfig} setMenuMountPoint={setHeaderActionMenu}>
   *       <MyRoutes />
   *     </Router>
   *   )
   * }
   * ```
   */
  setMenuMountPoint?: (menuMount: MountPoint | undefined) => void;
};

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
  | (BaseSplitProps & { items: TopNavMenuPopoverItemBeta[]; run?: never });

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

export type TopNavMenuItemCommonBeta =
  // If `items` is provided then `run` shouldn't be, as having items means the button opens a popover
  | (TopNavItemBase & { run: () => void; items?: undefined })
  | (TopNavItemBase & { run?: never; items: TopNavMenuPopoverItemBeta[] });

export type TopNavMenuItemBetaType = TopNavMenuItemCommonBeta & {
  order: number;
};

export type TopNavMenuPopoverItemBeta = Omit<TopNavMenuItemBetaType, 'iconType'> & {
  iconType?: IconType;
};

export type TopNavMenuActionItemBeta = TopNavMenuItemCommonBeta;

export type TopNavMenuSecondaryActionItemBeta = TopNavMenuActionItemBeta & {
  color?: EuiButtonColor;
  isFilled?: boolean;
};

export type TopNavMenuPrimaryActionItemBeta = Omit<TopNavMenuActionItemBeta, 'items'> & {
  splitButtonProps?: TopNavMenuSplitButtonProps;
};

export interface TopNavMenuConfigBeta {
  items?: TopNavMenuItemBetaType[];
  secondaryActionItem?: TopNavMenuSecondaryActionItemBeta;
  primaryActionItem?: TopNavMenuPrimaryActionItemBeta;
}

export type RegisteredTopNavMenuDataBeta = TopNavMenuItemBetaType & {
  appName?: string;
};
