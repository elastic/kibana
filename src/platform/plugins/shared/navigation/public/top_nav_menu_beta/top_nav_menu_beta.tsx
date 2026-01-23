/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiHeaderLinks, useIsWithinBreakpoints } from '@elastic/eui';
import { getTopNavItems } from './utils';
import { TopNavMenuActionButton } from './top_nav_menu_action_button';
import { TopNavMenuItem } from './top_nav_menu_item';
import { TopNavMenuOverflowButton } from './top_nav_menu_overflow_button';
import type { TopNavMenuConfigBeta } from './types';

export interface TopNavMenuItemsProps {
  config?: TopNavMenuConfigBeta;
  visible?: boolean;
}

const hasNoItems = (config: TopNavMenuConfigBeta) =>
  !config.items?.length && !config?.primaryActionItem && !config?.secondaryActionItem;

export const TopNavMenuBeta = ({ config, visible = true }: TopNavMenuItemsProps) => {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const isBetweenMandXlBreakpoint = useIsWithinBreakpoints(['m', 'l']);
  const isAboveXlBreakpoint = useIsWithinBreakpoints(['xl']);

  if (!config || hasNoItems(config) || !visible) {
    return null;
  }

  const primaryActionItem = config?.primaryActionItem;
  const secondaryActionItem = config?.secondaryActionItem;
  const showMoreButtonId = 'show-more';

  const headerLinksProps = {
    'data-test-subj': 'top-nav',
    gutterSize: 'xs' as const,
    popoverBreakpoints: 'none' as const,
    className: 'kbnTopNavMenu__wrapper',
  };

  const { displayedItems, overflowItems, shouldOverflow } = getTopNavItems({
    config,
  });

  const handlePopoverToggle = (id: string) => {
    setOpenPopoverId(openPopoverId === id ? null : id);
  };

  const handleOnPopoverClose = () => {
    setOpenPopoverId(null);
  };

  const primaryActionComponent = primaryActionItem ? (
    <TopNavMenuActionButton
      {...primaryActionItem}
      isPopoverOpen={openPopoverId === primaryActionItem.id}
      onPopoverToggle={() => {
        handlePopoverToggle(primaryActionItem.id);
      }}
      onPopoverClose={handleOnPopoverClose}
    />
  ) : undefined;

  const secondaryActionComponent = secondaryActionItem ? (
    <TopNavMenuActionButton
      {...secondaryActionItem}
      isPopoverOpen={openPopoverId === secondaryActionItem.id}
      onPopoverToggle={() => {
        handlePopoverToggle(secondaryActionItem.id);
      }}
      onPopoverClose={handleOnPopoverClose}
    />
  ) : undefined;

  if (isBetweenMandXlBreakpoint) {
    return (
      <EuiHeaderLinks {...headerLinksProps}>
        <TopNavMenuOverflowButton
          items={[...displayedItems, ...overflowItems]}
          isPopoverOpen={openPopoverId === showMoreButtonId}
          onPopoverToggle={() => handlePopoverToggle(showMoreButtonId)}
          onPopoverClose={handleOnPopoverClose}
        />
        {secondaryActionComponent}
        {primaryActionComponent}
      </EuiHeaderLinks>
    );
  }

  if (isAboveXlBreakpoint) {
    return (
      <EuiHeaderLinks {...headerLinksProps}>
        {displayedItems?.length > 0 &&
          displayedItems.map((menuItem) => (
            <TopNavMenuItem
              key={menuItem.id}
              {...menuItem}
              isPopoverOpen={openPopoverId === menuItem.id}
              onPopoverToggle={() => handlePopoverToggle(menuItem.id)}
              onPopoverClose={handleOnPopoverClose}
            />
          ))}
        {shouldOverflow && (
          <TopNavMenuOverflowButton
            items={overflowItems}
            isPopoverOpen={openPopoverId === showMoreButtonId}
            onPopoverToggle={() => handlePopoverToggle(showMoreButtonId)}
            onPopoverClose={handleOnPopoverClose}
          />
        )}
        {secondaryActionComponent}
        {primaryActionComponent}
      </EuiHeaderLinks>
    );
  }

  return (
    <EuiHeaderLinks {...headerLinksProps}>
      <TopNavMenuOverflowButton
        items={[...displayedItems, ...overflowItems]}
        isPopoverOpen={openPopoverId === showMoreButtonId}
        secondaryActionItem={secondaryActionItem}
        primaryActionItem={primaryActionItem}
        onPopoverToggle={() => handlePopoverToggle(showMoreButtonId)}
        onPopoverClose={handleOnPopoverClose}
      />
    </EuiHeaderLinks>
  );
};
