/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiHeaderLinks, useIsWithinBreakpoints } from '@elastic/eui';
import { getAppMenuConfigWithoutHeaderTabs, getAppMenuItems, isChromeBarV2Layout } from '../utils';
import { AppMenuChromeBarV2Collapsed, AppMenuChromeBarV2Wide } from './app_menu_chrome_bar_v2';
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

const hasNoItems = (config: AppMenuConfig) => {
  if (isChromeBarV2Layout(config)) {
    const hasSecondary =
      (config.secondaryActionItems?.length ?? 0) > 0 || Boolean(config.secondaryActionItem);
    const hasOverflow = (config.overflowOnlyItems?.length ?? 0) > 0;
    const hasPrimary = Boolean(config.primaryActionItem);
    const hasSecondaryAppend = Boolean(config.secondaryActionAppend);
    return !hasSecondary && !hasOverflow && !hasPrimary && !hasSecondaryAppend;
  }
  return !config.items?.length && !config?.primaryActionItem && !config?.secondaryActionItem;
};

export const AppMenuComponent = ({
  config,
  visible = true,
  isCollapsed = false,
}: AppMenuItemsProps) => {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const isBetweenMandXlBreakpoint = useIsWithinBreakpoints(['m', 'l']);
  const isAboveXlBreakpoint = useIsWithinBreakpoints(['xl']);

  if (!config || !visible) {
    return null;
  }

  const configForMenuStrip = getAppMenuConfigWithoutHeaderTabs(config);

  if (hasNoItems(configForMenuStrip)) {
    return null;
  }

  const primaryActionItem = configForMenuStrip.primaryActionItem;
  const secondaryActionItem = configForMenuStrip.secondaryActionItem;
  const showMoreButtonId = 'show-more';

  const headerLinksProps = {
    'data-test-subj': 'app-menu',
    gutterSize: 'xxs' as const,
    popoverBreakpoints: 'none' as const,
    className: 'kbnTopNavMenu__wrapper',
  };

  if (isChromeBarV2Layout(configForMenuStrip)) {
    if (isCollapsed) {
      return (
        <AppMenuChromeBarV2Collapsed
          config={configForMenuStrip}
          headerLinksProps={headerLinksProps}
        />
      );
    }
    if (isBetweenMandXlBreakpoint || isAboveXlBreakpoint) {
      return (
        <AppMenuChromeBarV2Wide config={configForMenuStrip} headerLinksProps={headerLinksProps} />
      );
    }
    return (
      <AppMenuChromeBarV2Collapsed
        config={configForMenuStrip}
        headerLinksProps={headerLinksProps}
      />
    );
  }

  const { displayedItems, overflowItems, shouldOverflow } = getAppMenuItems({
    config: configForMenuStrip,
  });

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

  const secondaryActionComponent = secondaryActionItem ? (
    <AppMenuActionButton
      {...secondaryActionItem}
      isSecondaryAction
      isPopoverOpen={openPopoverId === secondaryActionItem.id}
      onPopoverToggle={() => {
        handlePopoverToggle(secondaryActionItem.id);
      }}
      onPopoverClose={handleOnPopoverClose}
    />
  ) : undefined;

  const collapsedComponent = (
    <AppMenuOverflowButton
      items={[...displayedItems, ...overflowItems]}
      isPopoverOpen={openPopoverId === showMoreButtonId}
      secondaryActionItem={secondaryActionItem}
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
        {secondaryActionComponent}
        {primaryActionComponent}
      </EuiHeaderLinks>
    );
  }

  return <EuiHeaderLinks {...headerLinksProps}>{collapsedComponent}</EuiHeaderLinks>;
};
