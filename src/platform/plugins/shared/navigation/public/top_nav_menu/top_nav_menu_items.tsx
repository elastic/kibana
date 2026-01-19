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
import type { TopNavMenuData } from './top_nav_menu_data';
import { TopNavMenuItem } from './top_nav_menu_item';

const POPOVER_BREAKPOINTS: EuiBreakpointSize[] = ['xs', 's'];

interface TopNavMenuItemsProps {
  config: TopNavMenuData[] | undefined;
  className?: string;
  popoverBreakpoints?: EuiBreakpointSize[];
  gutterSize?: EuiHeaderLinksProps['gutterSize'];
}

/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export const TopNavMenuItems = ({
  config,
  className,
  popoverBreakpoints = POPOVER_BREAKPOINTS,
  gutterSize = 'xs',
}: TopNavMenuItemsProps) => {
  const isMobileMenu = useIsWithinBreakpoints(popoverBreakpoints);

  if (!config || config.length === 0) return null;
  return (
    <EuiHeaderLinks
      data-test-subj="top-nav"
      gutterSize={gutterSize}
      className={className}
      popoverBreakpoints={popoverBreakpoints}
    >
      {(closePopover) =>
        config.map((menuItem: TopNavMenuData, i: number) => {
          return (
            <TopNavMenuItem
              key={`nav-menu-${i}`}
              isMobileMenu={isMobileMenu}
              closePopover={closePopover}
              {...menuItem}
            />
          );
        })
      }
    </EuiHeaderLinks>
  );
};
