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

type AppMenuLayout = 'collapsed' | 'minimal' | 'expanded';

const APPLICATION_LAYOUTS: Record<EuiBreakpointSize, AppMenuLayout> = {
  xs: 'collapsed',
  s: 'minimal',
  m: 'expanded',
  l: 'expanded',
  xl: 'expanded',
};

const VIEWPORT_LAYOUTS: Record<EuiBreakpointSize, AppMenuLayout> = {
  xs: 'collapsed',
  s: 'collapsed',
  m: 'minimal',
  l: 'minimal',
  xl: 'expanded',
};

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
  content: Record<AppMenuLayout, React.ReactNode>;
}

type AppMenuResolvedResponsiveContentProps = AppMenuResponsiveContentProps & {
  breakpoint: EuiBreakpointSize | undefined;
  source: AppMenuBreakpointSource;
};

const AppMenuResponsiveContent = ({
  content,
  breakpoint,
  source,
}: AppMenuResolvedResponsiveContentProps) => {
  const layouts = source === 'application' ? APPLICATION_LAYOUTS : VIEWPORT_LAYOUTS;
  const layout = breakpoint ? layouts[breakpoint] : 'collapsed';

  return <AppMenuHeaderLinks>{content[layout]}</AppMenuHeaderLinks>;
};

const AppMenuApplicationResponsiveContent = (props: AppMenuResponsiveContentProps) => {
  const applicationBreakpoint = useCurrentChromeApplicationBreakpoint();
  const viewportBreakpoint = useCurrentEuiBreakpoint();

  return (
    <AppMenuResponsiveContent
      {...props}
      breakpoint={applicationBreakpoint ?? viewportBreakpoint}
      source={applicationBreakpoint === undefined ? 'viewport' : 'application'}
    />
  );
};

const AppMenuViewportResponsiveContent = (props: AppMenuResponsiveContentProps) => {
  const breakpoint = useCurrentEuiBreakpoint();

  return <AppMenuResponsiveContent {...props} breakpoint={breakpoint} source="viewport" />;
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
  const processedStaticItems = processStaticItems(staticItems);
  const hasStaticItems = processedStaticItems.length > 0;

  const { displayedItems, overflowItems } = getAppMenuItems({
    config,
    hasStaticItems,
  });

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
      items={[...displayedItems, ...overflowItems]}
      staticItems={processedStaticItems}
      isPopoverOpen={openPopoverId === showMoreButtonId}
      primaryActionItem={primaryActionItem}
      switchConfig={switchConfig}
      onPopoverToggle={() => handlePopoverToggle(showMoreButtonId)}
      onPopoverClose={handleOnPopoverClose}
    />
  );

  const renderInlineContent = (inlineItemLimit: number) => {
    const inlineItems = displayedItems.slice(0, inlineItemLimit);
    const responsiveOverflowItems = [...displayedItems.slice(inlineItemLimit), ...overflowItems];
    const shouldShowOverflow = responsiveOverflowItems.length > 0 || hasStaticItems;
    const hasSecondaryActions =
      Boolean(switchConfig) || inlineItems.length > 0 || shouldShowOverflow;

    return (
      <>
        {hasSecondaryActions && (
          <div css={secondaryActionsCss}>
            {switchConfig && <AppMenuSwitchComponent switchConfig={switchConfig} />}
            {inlineItems.map((menuItem) => (
              <AppMenuItem
                key={menuItem.id}
                {...menuItem}
                isPopoverOpen={openPopoverId === menuItem.id}
                onPopoverToggle={() => handlePopoverToggle(menuItem.id)}
                onPopoverClose={handleOnPopoverClose}
              />
            ))}
            {shouldShowOverflow && (
              <AppMenuOverflowButton
                items={responsiveOverflowItems}
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
  };

  const content: Record<AppMenuLayout, React.ReactNode> = {
    collapsed: collapsedComponent,
    minimal: renderInlineContent(0),
    expanded: renderInlineContent(displayedItems.length),
  };

  const ResponsiveContent =
    breakpointSource === 'application'
      ? AppMenuApplicationResponsiveContent
      : AppMenuViewportResponsiveContent;

  return <ResponsiveContent content={content} />;
};
