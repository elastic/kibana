/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiHeaderLinks, EuiShowFor } from '@elastic/eui';
import React from 'react';
import type { TopNavMenuData } from './top_nav_menu_data';
import { TopNavMenuItem } from './top_nav_menu_item';

/** If useMobileIconTypes=true, then the config array should contain items that have a valid iconType or mobileIconType */
type TopNavMenuItemsIconType = { mobileIconType: string } | { iconType: string };
interface TopNavMenuItemsPropsButtonIcons {
  config: Array<TopNavMenuData & TopNavMenuItemsIconType>;
  useMobileIconTypes: true;
}
/** If useMobileIconTypes=false, then the config array will have "typical" TopNavMenuData items */
interface TopNavMenuItemsPropsTextLabel {
  config: TopNavMenuData[] | undefined;
  useMobileIconTypes?: boolean;
}

type TopNavMenuItemsPropsButtonConfig =
  | TopNavMenuItemsPropsButtonIcons
  | TopNavMenuItemsPropsTextLabel;

type TopNavMenuItemsProps = {
  className?: string;
} & TopNavMenuItemsPropsButtonConfig;

export const TopNavMenuItems = (props: TopNavMenuItemsProps) => {
  const { config, className, useMobileIconTypes } = props;
  if (!config || config.length === 0) return null;

  // on ['m'] size, button icons will overlap the breadcrumbs on the left-hand-side of the top nav
  const sizesForButtonIcons = ['m'];
  // on ['xs', 's'] size, text buttons will appear inside of a popover
  const sizesForTextButtons = ['xs', 's', 'l', 'xl'];

  if (useMobileIconTypes) {
    return (
      <EuiHeaderLinks data-test-subj="top-nav" gutterSize="xs" className={className}>
        <EuiShowFor sizes={sizesForButtonIcons}>
          {config.map((menuItem, i) => {
            const { mobileIconType, iconType, label, tooltip, ...navMenuItem } = menuItem;
            const navItemIconType = mobileIconType ?? iconType;
            return (
              <TopNavMenuItem
                key={`nav-menu-${i}`}
                forButtonIcons={true}
                iconType={navItemIconType!}
                tooltip={tooltip ?? label}
                {...navMenuItem}
              />
            );
          })}
        </EuiShowFor>
        <EuiShowFor sizes={sizesForTextButtons}>
          {config.map((menuItem: TopNavMenuData, i: number) => {
            return <TopNavMenuItem key={`nav-menu-${i}`} {...menuItem} />;
          })}
        </EuiShowFor>
      </EuiHeaderLinks>
    );
  }

  return (
    <EuiHeaderLinks data-test-subj="top-nav" gutterSize="xs" className={className}>
      {config.map((menuItem: TopNavMenuData, i: number) => {
        return <TopNavMenuItem key={`nav-menu-${i}`} {...menuItem} />;
      })}
    </EuiHeaderLinks>
  );
};
