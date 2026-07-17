/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiHeaderLinks, type EuiBreakpointSize, useCurrentEuiBreakpoint } from '@elastic/eui';
import { useCurrentChromeApplicationBreakpoint } from '@kbn/core-chrome-layout-utils';
import { css } from '@emotion/react';
import { getAppMenuItems, hasNonGlobalStaticItems, processStaticItems } from '../utils';
import { AppMenuActionButton } from './app_menu_action_button';
import { AppMenuItem } from './app_menu_item';
import { AppMenuOverflowButton } from './app_menu_overflow_button';
import { AppMenuSwitchComponent } from './app_menu_switch';
import type { AppMenuConfig, AppMenuStaticItem } from '../types';
import { APP_MENU_TEST_SUBJECTS } from '../test_subjects';

const secondaryActionsCss = css`
  display: flex;
  align-items: center;
`;

export interface AppMenuItemsProps {
  config?: AppMenuConfig;
  visible?: boolean;
  breakpointSource?: AppMenuBreakpointSource;
  /**
   * Static items that always appear at the end of the overflow menu.
   */
  staticItems?: AppMenuStaticItem[];
}

export type AppMenuBreakpointSource = 'application' | 'viewport';

const hasNoItems = (config: AppMenuConfig) =>
  !config.items?.length && !config?.primaryActionItem && !config?.switch;

const AppMenuHeaderLinks = ({ children }: { children: React.ReactNode }) => (
  <EuiHeaderLinks
    data-test-subj={APP_MENU_TEST_SUBJECTS.root}
    gutterSize="xs"
    popoverBreakpoints="none"
    className="kbnTopNavMenu__wrapper"
  >
    {children}
  </EuiHeaderLinks>
);

interface AppMenuResponsiveContentProps {
  collapsedContent: React.ReactNode;
  mediumContent: React.ReactNode;
  wideContent: React.ReactNode;
}

type AppMenuResolvedResponsiveContentProps = AppMenuResponsiveContentProps & {
  breakpoint: EuiBreakpointSize | undefined;
  usesApplicationBreakpoint: boolean;
};

const AppMenuResponsiveContent = ({
  collapsedContent,
  mediumContent,
  wideContent,
  breakpoint,
  usesApplicationBreakpoint,
}: AppMenuResolvedResponsiveContentProps) => {
  // Preserve the previous viewport behavior for Classic and legacy Project Chrome.
  const isWide = usesApplicationBreakpoint
    ? breakpoint === 'm' || breakpoint === 'l' || breakpoint === 'xl'
    : breakpoint === 'xl';
  const isMedium = usesApplicationBreakpoint
    ? breakpoint === 's'
    : breakpoint === 'm' || breakpoint === 'l';
  const content = isWide ? wideContent : isMedium ? mediumContent : collapsedContent;

  return <AppMenuHeaderLinks>{content}</AppMenuHeaderLinks>;
};

const AppMenuApplicationResponsiveContent = (props: AppMenuResponsiveContentProps) => {
  const applicationBreakpoint = useCurrentChromeApplicationBreakpoint();
  const viewportBreakpoint = useCurrentEuiBreakpoint();

  return (
    <AppMenuResponsiveContent
      {...props}
      breakpoint={applicationBreakpoint ?? viewportBreakpoint}
      usesApplicationBreakpoint={applicationBreakpoint !== undefined}
    />
  );
};

const AppMenuViewportResponsiveContent = (props: AppMenuResponsiveContentProps) => {
  const breakpoint = useCurrentEuiBreakpoint();

  return (
    <AppMenuResponsiveContent
      {...props}
      breakpoint={breakpoint}
      usesApplicationBreakpoint={false}
    />
  );
};

export const AppMenuComponent = ({
  config,
  visible = true,
  breakpointSource = 'application',
  staticItems,
}: AppMenuItemsProps) => {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  /**
   * Global static items are registered once, usually before
   * an application is mounted, and this can cause flickering when
   * the app menu is first rendered without app specific config.
   * If only global static items are present, we don't want to render
   * the app menu.
   */
  const hasVisibleStaticItems = hasNonGlobalStaticItems(staticItems);

  if ((!config || hasNoItems(config)) && !hasVisibleStaticItems) {
    return null;
  }

  if (!visible) {
    return null;
  }

  const primaryActionItem = config?.primaryActionItem;
  const switchConfig = config?.switch;
  const showMoreButtonId = 'show-more';

  const {
    displayedItems,
    overflowItems,
    shouldOverflow: shouldOverflowBase,
  } = getAppMenuItems({
    config,
    hasStaticItems: hasVisibleStaticItems,
  });

  const processedStaticItems = processStaticItems(staticItems);

  const allOverflowItems = [...overflowItems];
  const shouldOverflow = shouldOverflowBase || processedStaticItems.length > 0;
  const hasSecondaryActions =
    Boolean(switchConfig) ||
    displayedItems.length > 0 ||
    allOverflowItems.length > 0 ||
    processedStaticItems.length > 0;

  const handlePopoverToggle = (id: string) => {
    setOpenPopoverId((prev) => (prev === id ? null : id));
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
      switchConfig={switchConfig}
      onPopoverToggle={() => handlePopoverToggle(showMoreButtonId)}
      onPopoverClose={handleOnPopoverClose}
    />
  );

  const mediumContent = (
    <>
      {hasSecondaryActions && (
        <div css={secondaryActionsCss}>
          {switchConfig && <AppMenuSwitchComponent switchConfig={switchConfig} />}
          <AppMenuOverflowButton
            items={[...displayedItems, ...allOverflowItems]}
            staticItems={processedStaticItems}
            isPopoverOpen={openPopoverId === showMoreButtonId}
            onPopoverToggle={() => handlePopoverToggle(showMoreButtonId)}
            onPopoverClose={handleOnPopoverClose}
          />
        </div>
      )}
      {primaryActionComponent}
    </>
  );

  const wideContent = (
    <>
      {hasSecondaryActions && (
        <div css={secondaryActionsCss}>
          {switchConfig && <AppMenuSwitchComponent switchConfig={switchConfig} />}
          {displayedItems.map((menuItem) => (
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
        </div>
      )}
      {primaryActionComponent}
    </>
  );

  const ResponsiveContent =
    breakpointSource === 'application'
      ? AppMenuApplicationResponsiveContent
      : AppMenuViewportResponsiveContent;

  return (
    <ResponsiveContent
      collapsedContent={collapsedComponent}
      mediumContent={mediumContent}
      wideContent={wideContent}
    />
  );
};
