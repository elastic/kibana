/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useLayoutEffect } from 'react';
import type { DistributiveOmit } from '@elastic/eui';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import type { AppHeaderBack, AppHeaderConfig, AppHeaderSpacing, AppHeaderTitle } from '../types';
import { useHasLegacyActionMenu } from './hooks/chrome';
import { AppHeaderShell } from './app_header_shell';
import { AppBadges } from './app_badges';
import { AppTabs } from './app_tabs';
import { TitleArea } from './title_area';
import { TitleActions } from './title_actions';
import { AppMenu } from './app_menu';
import { AppHeaderMetadata } from './app_header_metadata';
import { AppHeaderDescription } from './app_header_description';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';
import { useCanAccessIntegrations, useResolvedBadges, useShareAction } from './hooks';

export type AppHeaderViewProps = DistributiveOmit<AppHeaderConfig, 'back' | 'spacing'> & {
  back?: AppHeaderBack | AppHeaderBack[];
  /**
   * Defaults to `true`. Set to `false` only when the surrounding full-page layout provides its own
   * sticky-header mechanism for the correct scrolling container.
   */
  sticky?: boolean;
  /**
   * Controls the horizontal inset. `standard` keeps the 16px symmetric gutter. When omitted it
   * defaults to `standard`, except a titleless header (only a back and/or overflow button) defaults
   * to `compact` so sparse legacy states don't look too tall. Bleed modes are compatibility options
   * for headers that cannot yet move outside a padded parent.
   */
  spacing?: AppHeaderSpacing;
  docLink?: string;
  showAddIntegrations?: boolean;
};

type AppHeaderViewInternalProps = AppHeaderViewProps & {
  titleAppend?: ReactNode;
  borderless?: boolean;
};

const getPublicAppHeaderViewProps = ({
  title,
  back,
  tabs,
  badges,
  menu,
  favorite,
  description,
  metadata,
  sticky,
  spacing,
  docLink,
  showAddIntegrations,
}: AppHeaderViewProps): AppHeaderViewProps => {
  const secondaryContent = description ? { description } : metadata ? { metadata } : {};

  return {
    title,
    back,
    tabs,
    badges,
    menu,
    favorite,
    ...secondaryContent,
    sticky,
    spacing,
    docLink,
    showAddIntegrations,
  };
};

const AppHeaderViewInternal = React.memo<AppHeaderViewInternalProps>(
  ({
    title,
    back,
    tabs,
    badges,
    menu,
    favorite,
    titleAppend,
    description,
    metadata,
    sticky,
    spacing,
    borderless,
    docLink,
    showAddIntegrations,
  }) => {
    const hasLegacyActionMenu = useHasLegacyActionMenu();
    const shareAction = useShareAction(menu);
    const resolvedBadges = useResolvedBadges(badges);
    const canAccessIntegrations = useCanAccessIntegrations();
    const showIntegrations = !!showAddIntegrations && canAccessIntegrations;

    // Sparse legacy states (only a back and/or overflow-menu button, no title or other content) look
    // too tall at the standard height, so default them to the shorter `compact` spacing. An explicit
    // `spacing` from the caller always wins.
    const isSparse =
      title === undefined &&
      !resolvedBadges?.length &&
      !tabs?.length &&
      !description &&
      !metadata?.length &&
      !titleAppend &&
      !favorite;
    const resolvedSpacing = spacing ?? (isSparse ? 'compact' : 'standard');

    // Match the title size to the spacing: the shorter `compact` header uses an `xs` title, while the
    // roomier standard/bleed headers use `s`.
    const titleSize = resolvedSpacing === 'compact' ? 'xs' : 's';

    const show =
      title !== undefined ||
      back !== undefined ||
      !!tabs?.length ||
      !!resolvedBadges?.length ||
      !!menu?.items?.length ||
      !!titleAppend ||
      !!shareAction ||
      !!favorite ||
      !!description ||
      !!metadata?.length ||
      !!docLink ||
      showIntegrations ||
      hasLegacyActionMenu;

    if (!show) {
      return null;
    }

    return (
      <AppHeaderShell
        title={<TitleArea title={title} back={back} size={titleSize} />}
        badges={<AppBadges badges={resolvedBadges} />}
        titleActions={<TitleActions shareAction={shareAction} favorite={favorite} />}
        titleAppend={titleAppend}
        trailing={
          <AppMenu menu={menu} docLink={docLink} showAddIntegrations={showAddIntegrations} />
        }
        secondaryContent={
          description ? (
            <AppHeaderDescription description={description} />
          ) : metadata?.length ? (
            <AppHeaderMetadata metadata={metadata} />
          ) : undefined
        }
        secondaryContentTestSubj={
          description
            ? APP_HEADER_TEST_SUBJECTS.description
            : metadata?.length
            ? APP_HEADER_TEST_SUBJECTS.metadata
            : undefined
        }
        tabs={tabs?.length ? <AppTabs tabs={tabs} /> : undefined}
        sticky={sticky}
        spacing={resolvedSpacing}
        borderless={borderless}
      />
    );
  }
);

AppHeaderViewInternal.displayName = 'AppHeaderViewInternal';

export const AppHeaderView = React.memo<AppHeaderViewProps>((props) => {
  return <AppHeaderViewInternal {...getPublicAppHeaderViewProps(props)} />;
});

AppHeaderView.displayName = 'AppHeaderView';

export type AppHeaderProps = AppHeaderViewProps & {
  title: AppHeaderTitle;
};

type InlineAppHeaderProps = AppHeaderViewInternalProps & {
  title: AppHeaderTitle;
};

const InlineAppHeader = React.memo<InlineAppHeaderProps>((props) => {
  const chrome = useChromeService();
  useLayoutEffect(() => {
    chrome.next.inlineAppHeader.set(true);
    return () => chrome.next.inlineAppHeader.set(false);
  }, [chrome]);

  return <AppHeaderViewInternal {...props} />;
});

InlineAppHeader.displayName = 'InlineAppHeader';

export const AppHeader = React.memo<AppHeaderProps>((props) => (
  <InlineAppHeader {...getPublicAppHeaderViewProps(props)} title={props.title} />
));

AppHeader.displayName = 'AppHeader';

export type DiscoverAppHeaderProps = AppHeaderProps & {
  tabsBar?: ReactNode;
};

export const DiscoverAppHeader = React.memo<DiscoverAppHeaderProps>(({ tabsBar, ...props }) => (
  <InlineAppHeader
    {...getPublicAppHeaderViewProps(props)}
    title={props.title}
    titleAppend={tabsBar}
    borderless={tabsBar != null}
  />
));

DiscoverAppHeader.displayName = 'DiscoverAppHeader';
