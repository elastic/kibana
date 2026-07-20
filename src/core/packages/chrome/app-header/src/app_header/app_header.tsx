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
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import type {
  AppHeaderBack,
  AppHeaderBadge,
  AppHeaderMetadataItems,
  AppHeaderSpacing,
  AppHeaderTab,
  AppHeaderTitle,
} from '../types';
import { useHasLegacyActionMenu } from './hooks/chrome';
import { AppHeaderShell } from './app_header_shell';
import { AppBadges } from './app_badges';
import { AppTabs } from './app_tabs';
import { TitleArea } from './title_area';
import { TitleActions } from './title_actions';
import { AppMenu } from './app_menu';
import { AppHeaderMetadata } from './app_header_metadata';
import { useResolvedBadges, useShareAction } from './hooks';

export interface AppHeaderViewProps {
  title?: AppHeaderTitle;
  back?: AppHeaderBack | AppHeaderBack[];
  tabs?: AppHeaderTab[];
  badges?: AppHeaderBadge[];
  menu?: AppMenuConfig & { isCollapsed?: boolean };
  /**
   * @deprecated Temporary slot for `FavoriteButton` or a thin wrapper around it. Replace this with
   * the typed favorite action API tracked in https://github.com/elastic/kibana/issues/271402.
   */
  favorite?: ReactNode;
  metadata?: AppHeaderMetadataItems;
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
  /**
   * Omits the header's bottom border. Used when the content rendered below the header owns the
   * separating line instead (e.g. Discover using UnifiedTabs).
   */
  borderless?: boolean;
}

interface AppHeaderViewInternalProps extends AppHeaderViewProps {
  titleAppend?: ReactNode;
}

const AppHeaderViewInternal = React.memo<AppHeaderViewInternalProps>(
  ({
    title,
    back,
    tabs,
    badges,
    menu,
    favorite,
    titleAppend,
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

    // Sparse legacy states (only a back and/or overflow-menu button, no title or other content) look
    // too tall at the standard height, so default them to the shorter `compact` spacing. An explicit
    // `spacing` from the caller always wins.
    const isSparse =
      title === undefined &&
      !resolvedBadges?.length &&
      !tabs?.length &&
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
      !!metadata?.length ||
      !!docLink ||
      !!showAddIntegrations ||
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
        metadata={metadata?.length ? <AppHeaderMetadata metadata={metadata} /> : undefined}
        tabs={tabs?.length ? <AppTabs tabs={tabs} /> : undefined}
        sticky={sticky}
        spacing={resolvedSpacing}
        borderless={borderless}
      />
    );
  }
);

AppHeaderViewInternal.displayName = 'AppHeaderViewInternal';

export const AppHeaderView = React.memo<AppHeaderViewProps>((props) => (
  <AppHeaderViewInternal {...props} />
));

AppHeaderView.displayName = 'AppHeaderView';

export interface AppHeaderProps extends AppHeaderViewProps {
  title: AppHeaderTitle;
}

interface InlineAppHeaderProps extends AppHeaderViewInternalProps {
  title: AppHeaderTitle;
}

const InlineAppHeader = React.memo<InlineAppHeaderProps>((props) => {
  const chrome = useChromeService();
  useLayoutEffect(() => {
    chrome.next.inlineAppHeader.set(true);
    return () => chrome.next.inlineAppHeader.set(false);
  }, [chrome]);

  return <AppHeaderViewInternal {...props} />;
});

InlineAppHeader.displayName = 'InlineAppHeader';

export const AppHeader = React.memo<AppHeaderProps>((props) => <InlineAppHeader {...props} />);

AppHeader.displayName = 'AppHeader';

export interface DiscoverAppHeaderProps extends AppHeaderProps {
  tabsBar?: ReactNode;
}

export const DiscoverAppHeader = React.memo<DiscoverAppHeaderProps>(({ tabsBar, ...props }) => (
  <InlineAppHeader {...props} titleAppend={tabsBar} />
));

DiscoverAppHeader.displayName = 'DiscoverAppHeader';
