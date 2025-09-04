/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBreakpointSize } from '@elastic/eui';
import {
  EuiHeaderLinks,
  useIsWithinBreakpoints,
  type EuiHeaderLinksProps,
  EuiPopover,
  EuiContextMenu,
} from '@elastic/eui';
import React, { useState, useMemo } from 'react';
import type { TopNavMenuData } from './top_nav_menu_data';
import { TopNavMenuItem } from './top_nav_menu_item';

const POPOVER_BREAKPOINTS: EuiBreakpointSize[] = ['xs', 's'];
const MAX_VISIBLE_ITEMS = 5;

interface TopNavMenuItemsProps {
  config: TopNavMenuData[] | undefined;
  className?: string;
  popoverBreakpoints?: EuiBreakpointSize[];
  gutterSize?: EuiHeaderLinksProps['gutterSize'];
}

export const TopNavMenuItems = ({
  config,
  className,
  popoverBreakpoints = POPOVER_BREAKPOINTS,
  gutterSize = 'xxs',
}: TopNavMenuItemsProps) => {
  const isMobileMenu = useIsWithinBreakpoints(popoverBreakpoints);
  const [isMorePopoverOpen, setIsMorePopoverOpen] = useState(false);

  // Process menu items to separate visible from overflow
  const { visibleItems, overflowItems } = useMemo(() => {
    if (!config || config.length === 0) {
      return { visibleItems: [], overflowItems: [] };
    }

    // Separate items by type
    const primaryItems = config.filter((item) => item.emphasize);
    const secondaryItems = config.filter((item) => !item.emphasize);

    // Calculate how many secondary items can be shown before primary items
    const maxSecondaryItems = Math.max(0, MAX_VISIBLE_ITEMS);
    const visibleSecondaryItems = secondaryItems.slice(0, maxSecondaryItems);
    const overflowSecondaryItems = secondaryItems.slice(maxSecondaryItems);

    // Create the "More" button data
    const moreButton: TopNavMenuData = {
      id: 'more',
      label: 'More',
      run: () => setIsMorePopoverOpen(true),
      emphasize: false,
      iconOnly: true,
      iconType: 'boxesVertical',
    };

    // Build visible items: secondary items first, then More button (if needed), then primary items last
    let finalVisibleItems = [...visibleSecondaryItems];
    if (overflowSecondaryItems.length > 0) {
      finalVisibleItems.push(moreButton);
    }
    finalVisibleItems = [...finalVisibleItems, ...primaryItems];

    const finalOverflowItems = overflowSecondaryItems;

    return {
      visibleItems: finalVisibleItems,
      overflowItems: finalOverflowItems,
    };
  }, [config]);

  if (!config || config.length === 0) return null;

  return (
    <EuiHeaderLinks
      data-test-subj="top-nav"
      gutterSize={gutterSize}
      className={className}
      popoverBreakpoints={popoverBreakpoints}
    >
      {(closePopover) => (
        <>
          {/* Render visible items */}
          {visibleItems.map((menuItem: TopNavMenuData, i: number) => {
            // Special handling for the "More" button - wrap it in a popover
            if (menuItem.id === 'more') {
              return (
                <EuiPopover
                  key={`nav-menu-${i}`}
                  button={
                    <TopNavMenuItem
                      isMobileMenu={isMobileMenu}
                      closePopover={closePopover}
                      {...menuItem}
                    />
                  }
                  isOpen={isMorePopoverOpen}
                  closePopover={() => setIsMorePopoverOpen(false)}
                  panelPaddingSize="none"
                  anchorPosition="downRight"
                  ownFocus={false}
                >
                  <EuiContextMenu
                    initialPanelId={0}
                    size="s"
                    css={{ maxWidth: 160 }}
                    panels={[
                      {
                        id: 0,
                        items: overflowItems.map((item, index) => ({
                          name: item.label || item.id || `Item ${index}`,
                          onClick: () => {
                            item.run(document.createElement('div')); // Pass a dummy element
                            setIsMorePopoverOpen(false);
                          },
                          'data-test-subj': item.testId,
                        })),
                      },
                    ]}
                  />
                </EuiPopover>
              );
            }

            // Regular items render normally
            return (
              <TopNavMenuItem
                key={`nav-menu-${i}`}
                isMobileMenu={isMobileMenu}
                closePopover={closePopover}
                {...menuItem}
              />
            );
          })}
        </>
      )}
    </EuiHeaderLinks>
  );
};
