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
import { getAppMenuItems, processStaticItems } from '../utils';
import { AppMenuActionButton } from './app_menu_action_button';
import { AppMenuItem } from './app_menu_item';
import { AppMenuOverflowButton } from './app_menu_overflow_button';
import type { AppMenuConfig, AppMenuItemType } from '../types';

export interface AppMenuItemsProps {
  config?: AppMenuConfig;
  visible?: boolean;
  /**
   * Whether to render the app menu in a collapsed state (showing only the overflow button).
   * Only available for the standalone app menu component.
   * TODO: Remove this in favour of container queries once EUI supports them https://github.com/elastic/eui/issues/8822
   */
  isCollapsed?: boolean;
  /**
   * Static items that always appear at the end of the overflow menu.
   */
  staticItems?: AppMenuItemType[];
}

const hasNoItems = (config: AppMenuConfig) => !config.items?.length && !config?.primaryActionItem;

export const AppMenuComponent = ({
  config,
  visible = true,
  isCollapsed = false,
  staticItems,
}: AppMenuItemsProps) => {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const isBetweenMandXlBreakpoint = useIsWithinBreakpoints(['m', 'l']);
  const isAboveXlBreakpoint = useIsWithinBreakpoints(['xl']);

  const hasStaticItems = !!staticItems?.length;

  if ((!config || hasNoItems(config)) && !hasStaticItems) {
    return null;
  }

  if (!visible) {
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

  const {
    displayedItems,
    overflowItems,
    shouldOverflow: shouldOverflowBase,
  } = getAppMenuItems({
    config,
  });

  const processedStaticItems = processStaticItems(staticItems);

  const allOverflowItems = [...overflowItems];
  const shouldOverflow = shouldOverflowBase || processedStaticItems.length > 0;

  const handlePopoverToggle = (id: string) => {
    setOpenPopoverId(openPopoverId === id ? null : id);
  };

  const handleOnPopoverClose = () => {
    setOpenPopoverId(null);
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
      items={[...displayedItems, ...allOverflowItems]}
      staticItems={processedStaticItems}
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
          items={[...displayedItems, ...allOverflowItems]}
          staticItems={processedStaticItems}
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
            items={allOverflowItems}
            staticItems={processedStaticItems}
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
