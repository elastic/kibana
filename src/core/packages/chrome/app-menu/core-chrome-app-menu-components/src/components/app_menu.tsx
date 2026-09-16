/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiHeaderLinks, useIsWithinBreakpoints } from '@elastic/eui';
import { getAppMenuItems } from '../utils';
import { AppMenuActionButton } from './app_menu_action_button';
import { AppMenuItem } from './app_menu_item';
import { AppMenuOverflowButton } from './app_menu_overflow_button';
import type { AppMenuConfig } from '../types';

export interface AppMenuItemsProps {
  config?: AppMenuConfig;
  visible?: boolean;
  /**
   * Whether to render the app menu in a collapsed state (showing only the overflow button).
   * Only available for the standalone app menu component.
   * TODO: Remove this in favour of container queries once EUI supports them https://github.com/elastic/eui/issues/8822
   */
  isCollapsed?: boolean;
}

const hasNoItems = (config: AppMenuConfig) => !config.items?.length && !config?.primaryActionItem;

export const AppMenuComponent = ({
  config,
  visible = true,
  isCollapsed = false,
}: AppMenuItemsProps) => {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const isBetweenMandXlBreakpoint = useIsWithinBreakpoints(['m', 'l']);
  const isAboveXlBreakpoint = useIsWithinBreakpoints(['xl']);

  const handlePopoverToggle = useCallback((id: string) => {
    setOpenPopoverId((prev) => (prev === id ? null : id));
  }, []);

  const handleOnPopoverClose = useCallback(() => {
    setOpenPopoverId(null);
  }, []);

  // Memoize getAppMenuItems so displayedItems/overflowItems only get new references
  // when config actually changes, not on every render. Without this, the inline spread
  // `[...displayedItems, ...overflowItems]` below would create a new array on every render,
  // causing AppMenuPopover.panels to recompute and triggering the EuiContextMenu
  // componentDidUpdate → getDerivedStateFromProps → findMenuItems → setState cascade.
  const { displayedItems, overflowItems, shouldOverflow } = useMemo(
    () =>
      config
        ? getAppMenuItems({ config })
        : { displayedItems: [], overflowItems: [], shouldOverflow: false },
    [config]
  );

  const combinedItems = useMemo(
    () => [...displayedItems, ...overflowItems],
    [displayedItems, overflowItems]
  );

  if (!config || hasNoItems(config) || !visible) {
    return null;
  }

  const primaryActionItem = config?.primaryActionItem;
  const showMoreButtonId = 'show-more';

  const headerLinksProps = {
    'data-test-subj': 'app-menu',
    gutterSize: 'xs' as const,
    popoverBreakpoints: 'none' as const,
    className: 'kbnTopNavMenu__wrapper',
  };

  const primaryActionComponent = primaryActionItem ? (
    <AppMenuActionButton
      {...primaryActionItem}
      isPopoverOpen={openPopoverId === primaryActionItem.id}
      onPopoverToggle={() => {
        handlePopoverToggle(primaryActionItem.id);
      }}
      onPopoverClose={handleOnPopoverClose}
    />
  ) : undefined;

  const collapsedComponent = (
    <AppMenuOverflowButton
      items={combinedItems}
      isPopoverOpen={openPopoverId === showMoreButtonId}
      primaryActionItem={primaryActionItem}
      onPopoverToggle={() => handlePopoverToggle(showMoreButtonId)}
      onPopoverClose={handleOnPopoverClose}
    />
  );

  if (isCollapsed) {
    return <EuiHeaderLinks {...headerLinksProps}>{collapsedComponent}</EuiHeaderLinks>;
  }

  if (isBetweenMandXlBreakpoint) {
    return (
      <EuiHeaderLinks {...headerLinksProps}>
        <AppMenuOverflowButton
          items={combinedItems}
          isPopoverOpen={openPopoverId === showMoreButtonId}
          onPopoverToggle={() => handlePopoverToggle(showMoreButtonId)}
          onPopoverClose={handleOnPopoverClose}
        />
        {primaryActionComponent}
      </EuiHeaderLinks>
    );
  }

  if (isAboveXlBreakpoint) {
    return (
      <EuiHeaderLinks {...headerLinksProps}>
        {displayedItems?.length > 0 &&
          displayedItems.map((menuItem) => (
            <AppMenuItem
              key={menuItem.id}
              {...menuItem}
              isPopoverOpen={openPopoverId === menuItem.id}
              onPopoverToggle={() => handlePopoverToggle(menuItem.id)}
              onPopoverClose={handleOnPopoverClose}
            />
          ))}
        {shouldOverflow && (
          <AppMenuOverflowButton
            items={overflowItems}
            isPopoverOpen={openPopoverId === showMoreButtonId}
            onPopoverToggle={() => handlePopoverToggle(showMoreButtonId)}
            onPopoverClose={handleOnPopoverClose}
          />
        )}
        {primaryActionComponent}
      </EuiHeaderLinks>
    );
  }

  return <EuiHeaderLinks {...headerLinksProps}>{collapsedComponent}</EuiHeaderLinks>;
};
