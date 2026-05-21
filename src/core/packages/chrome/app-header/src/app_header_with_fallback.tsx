/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import type { EuiPageHeaderProps } from '@elastic/eui';
import { EuiPageHeader } from '@elastic/eui';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import type { AppHeaderTab } from './types';
import { AppHeader } from './app_header';
import type { AppHeaderProps } from './app_header';

export interface AppHeaderWithFallbackProps extends AppHeaderProps {
  fallback?: EuiPageHeaderProps | null;
}

const mapTabsForClassic = (nextTabs: AppHeaderTab[] | undefined): EuiPageHeaderProps['tabs'] => {
  if (!nextTabs?.length) return undefined;
  return nextTabs.map((t) => ({
    id: t.id,
    label: t.label,
    isSelected: t.isSelected,
    onClick: t.onClick,
    href: t.href,
  }));
};

export const AppHeaderWithFallback: FC<AppHeaderWithFallbackProps> = ({
  title,
  back,
  tabs,
  badges,
  menu,
  onShare,
  favorite,
  titleAppend,
  fallback,
  sticky,
  padding,
  docLink,
}) => {
  const chrome = useChromeService();

  if (!chrome.next.isEnabled) {
    if (fallback === null) return null;
    const { pageTitle: classicPageTitle, tabs: classicTabs, ...classicRest } = fallback ?? {};
    return (
      <EuiPageHeader
        {...classicRest}
        pageTitle={classicPageTitle ?? title}
        tabs={classicTabs ?? mapTabsForClassic(tabs)}
      />
    );
  }

  if (fallback === null && chrome.getChromeStyle() !== 'project') {
    return null;
  }

  return (
    <AppHeader
      title={title}
      back={back}
      tabs={tabs}
      badges={badges}
      menu={menu}
      onShare={onShare}
      favorite={favorite}
      titleAppend={titleAppend}
      sticky={sticky}
      padding={padding}
      docLink={docLink}
    />
  );
};
