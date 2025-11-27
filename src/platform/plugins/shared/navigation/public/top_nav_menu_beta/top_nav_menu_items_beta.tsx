/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiHeaderLinks } from '@elastic/eui';
import { getTopNavItems, hasNoItems } from './utils';
import type { TopNavMenuConfigBeta } from './types';
import { TopNavMenuActionButton } from './top_nav_menu_action_button';
import { TopNavMenuItemBeta } from './top_nav_menu_item_beta';
import { TopNavMenuShowMoreButton } from './top_nav_menu_show_more_button';

interface TopNavMenuItemsProps {
  config?: TopNavMenuConfigBeta;
}

export const TopNavMenuItemsBeta = ({ config }: TopNavMenuItemsProps) => {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  if (!config || hasNoItems(config)) {
    return null;
  }

  const primaryActionItem = config?.primaryActionItem;
  const secondaryActionItem = config?.secondaryActionItem;
  const showMoreButtonId = 'show-more';

  const { displayedItems, overflowItems, shouldOverflow } = getTopNavItems({
    config,
  });

  const handlePopoverToggle = (id: string) => {
    setOpenPopoverId(openPopoverId === id ? null : id);
  };

  const handleOnPopoverClose = () => {
    setOpenPopoverId(null);
  };

  return (
    <EuiHeaderLinks
      data-test-subj="top-nav"
      gutterSize="xs"
      popoverBreakpoints="none" // TODO: Waiting for decision on responsive behavior
    >
      {displayedItems?.length > 0 &&
        displayedItems.map((menuItem) => (
          <TopNavMenuItemBeta
            key={menuItem.id}
            {...menuItem}
            isPopoverOpen={openPopoverId === menuItem.id}
            onPopoverToggle={() => handlePopoverToggle(menuItem.id)}
            onPopoverClose={handleOnPopoverClose}
          />
        ))}
      {shouldOverflow && (
        <TopNavMenuShowMoreButton
          items={overflowItems}
          isPopoverOpen={openPopoverId === showMoreButtonId}
          onPopoverToggle={() => handlePopoverToggle(showMoreButtonId)}
          onPopoverClose={handleOnPopoverClose}
        />
      )}
      {secondaryActionItem && (
        <TopNavMenuActionButton
          {...secondaryActionItem}
          isPopoverOpen={openPopoverId === secondaryActionItem.id}
          onPopoverToggle={() => handlePopoverToggle(secondaryActionItem.id)}
          onPopoverClose={handleOnPopoverClose}
        />
      )}
      {primaryActionItem && (
        <TopNavMenuActionButton
          {...primaryActionItem}
          isPopoverOpen={openPopoverId === primaryActionItem.id}
          onPopoverToggle={() => handlePopoverToggle(primaryActionItem.id)}
          onPopoverClose={handleOnPopoverClose}
        />
      )}
    </EuiHeaderLinks>
  );
};
