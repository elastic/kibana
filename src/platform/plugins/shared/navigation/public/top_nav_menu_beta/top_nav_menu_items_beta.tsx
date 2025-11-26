/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHeaderLinks } from '@elastic/eui';
import { getTopNavItems } from './utils';
import type { TopNavMenuConfigBeta } from './types';
import { TopNavMenuActionButton } from './top_nav_menu_action_button';
import { TopNavMenuItemBeta } from './top_nav_menu_item_beta';
import { TopNavMenuShowMoreButton } from './top_nav_menu_show_more_button';

interface TopNavMenuItemsProps {
  config?: TopNavMenuConfigBeta;
  className?: string;
}

export const TopNavMenuItemsBeta = ({ config, className }: TopNavMenuItemsProps) => {
  if (!config || config.items.length === 0) return null;

  const { displayedItems, overflowItems, shouldOverflow } = getTopNavItems({
    config,
  });

  return (
    <EuiHeaderLinks data-test-subj="top-nav" gutterSize="xs" className={className}>
      {displayedItems.map((menuItem, i) => {
        return <TopNavMenuItemBeta key={`nav-menu-${i}`} {...menuItem} />;
      })}
      {shouldOverflow && <TopNavMenuShowMoreButton items={overflowItems} />}
      {config?.secondaryActionItem && <TopNavMenuActionButton {...config.secondaryActionItem} />}
      {config?.primaryActionItem && <TopNavMenuActionButton {...config.primaryActionItem} />}
    </EuiHeaderLinks>
  );
};
