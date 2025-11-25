/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBreakpointSize } from '@elastic/eui';
import { EuiHeaderLinks, useIsWithinBreakpoints, type EuiHeaderLinksProps } from '@elastic/eui';
import React from 'react';

import { getTopNavItems } from './utils';
import type { TopNavMenuConfigBeta } from './types';
import { TopNavMenuActionButton } from './top_nav_menu_action_button';
import { TopNavMenuItemBeta } from './top_nav_menu_item_beta';
import { TopNavMenuShowMoreButton } from './top_nav_menu_show_more_button';

const POPOVER_BREAKPOINTS: EuiBreakpointSize[] = ['xs', 's'];

interface TopNavMenuItemsProps {
  config: TopNavMenuConfigBeta | undefined;
  className?: string;
  popoverBreakpoints?: EuiBreakpointSize[];
  gutterSize?: EuiHeaderLinksProps['gutterSize'];
}

export const TopNavMenuItemsBeta = ({
  config,
  className,
  popoverBreakpoints = POPOVER_BREAKPOINTS,
  gutterSize = 'xs',
}: TopNavMenuItemsProps) => {
  const isMobileMenu = useIsWithinBreakpoints(popoverBreakpoints);

  if (!config || config.items.length === 0) return null;

  const { displayedItems, overflowItems, shouldOverflow } = getTopNavItems({
    config,
    isMobileMenu,
  });

  return (
    <EuiHeaderLinks
      data-test-subj="top-nav"
      gutterSize={gutterSize}
      className={className}
      popoverBreakpoints={popoverBreakpoints}
    >
      {(closePopover) => (
        <>
          {displayedItems.map((menuItem, i) => {
            return (
              <TopNavMenuItemBeta
                key={`nav-menu-${i}`}
                isMobileMenu={isMobileMenu}
                closePopover={closePopover}
                {...menuItem}
              />
            );
          })}
          {shouldOverflow && (
            <TopNavMenuShowMoreButton items={overflowItems} closePopover={closePopover} />
          )}
          {config.secondaryActionItem && (
            <TopNavMenuActionButton
              {...config.secondaryActionItem}
              closePopover={closePopover}
              isMobileMenu={isMobileMenu}
            />
          )}
          {config.primaryActionItem && (
            <TopNavMenuActionButton
              {...config.primaryActionItem}
              closePopover={closePopover}
              isMobileMenu={isMobileMenu}
            />
          )}
        </>
      )}
    </EuiHeaderLinks>
  );
};
