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
import type { TopNavMenuDataBeta } from '../top_nav_menu/top_nav_menu_data';
import { TopNavMenuActionButton } from './top_nav_menu_action_button';
import { TopNavMenuItemBeta } from './top_nav_menu_item_beta';

const POPOVER_BREAKPOINTS: EuiBreakpointSize[] = ['xs', 's'];

interface TopNavMenuItemsProps {
  config: TopNavMenuDataBeta | undefined;
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

  return (
    <EuiHeaderLinks
      data-test-subj="top-nav"
      gutterSize={gutterSize}
      className={className}
      popoverBreakpoints={popoverBreakpoints}
    >
      {(closePopover) => (
        <>
          {config.items.map((menuItem, i) => {
            return (
              <TopNavMenuItemBeta
                key={`nav-menu-${i}`}
                isMobileMenu={isMobileMenu}
                closePopover={closePopover}
                {...menuItem}
              />
            );
          })}
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
