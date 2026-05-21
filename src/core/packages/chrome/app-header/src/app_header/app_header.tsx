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
import type { AppHeaderBack, AppHeaderBadge, AppHeaderPadding, AppHeaderTab } from '../types';
import { useHasLegacyActionMenu } from './hooks/chrome';
import { AppHeaderShell } from './app_header_shell';
import { AppBadges } from './app_badges';
import { AppTabs } from './app_tabs';
import { TitleArea } from './title_area';
import { TitleActions } from './title_actions';
import { AppMenu } from './app_menu';
import { useShareAction } from './hooks';

export interface AppHeaderViewProps {
  title?: string;
  back?: AppHeaderBack | AppHeaderBack[];
  tabs?: AppHeaderTab[];
  badges?: AppHeaderBadge[];
  menu?: AppMenuConfig;
  onShare?: () => void;
  favorite?: ReactNode;
  titleAppend?: ReactNode;
  sticky?: boolean;
  padding?: AppHeaderPadding;
  docLink?: string;
}

export const AppHeaderView = React.memo<AppHeaderViewProps>(
  ({
    title,
    back,
    tabs,
    badges,
    menu,
    onShare,
    favorite,
    titleAppend,
    sticky,
    padding,
    docLink,
  }) => {
    const hasLegacyActionMenu = useHasLegacyActionMenu();
    const shareAction = useShareAction(menu, onShare);
    const show =
      title !== undefined ||
      back !== undefined ||
      !!tabs?.length ||
      !!badges?.length ||
      !!menu?.items?.length ||
      titleAppend != null ||
      hasLegacyActionMenu;

    if (!show) {
      return null;
    }

    return (
      <AppHeaderShell
        title={<TitleArea title={title} back={back} />}
        badges={<AppBadges badges={badges} />}
        titleActions={<TitleActions shareAction={shareAction} favorite={favorite} />}
        titleAppend={titleAppend}
        trailing={<AppMenu menu={menu} hasExplicitShare={!!onShare} docLink={docLink} />}
        tabs={tabs?.length ? <AppTabs tabs={tabs} /> : undefined}
        sticky={sticky}
        padding={padding}
      />
    );
  }
);

AppHeaderView.displayName = 'AppHeaderView';

export interface AppHeaderProps extends Omit<AppHeaderViewProps, 'back'> {
  title: string;
  back?: string | AppHeaderBack;
}

export const AppHeader = React.memo<AppHeaderProps>(({ back, ...rest }) => {
  const chrome = useChromeService();
  useLayoutEffect(() => {
    chrome.next.inlineAppHeader.set(true);
    return () => chrome.next.inlineAppHeader.set(false);
  }, [chrome]);

  const resolvedBack = typeof back === 'string' ? { href: back } : back;

  return <AppHeaderView {...rest} back={resolvedBack} />;
});

AppHeader.displayName = 'AppHeader';
