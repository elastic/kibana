/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useObservable } from '@kbn/use-observable';
import type { AppHeaderBack } from '@kbn/app-header';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { AppHeaderView } from '@kbn/app-header';
import { useHasLegacyActionMenu } from '../shared/chrome_hooks';

function getBreadcrumbText(crumb: ChromeBreadcrumb): string | undefined {
  if (typeof crumb.text === 'string') return crumb.text;
  if (typeof crumb['aria-label'] === 'string') return crumb['aria-label'];
  return undefined;
}

interface FallbackProps {
  hasContent: boolean;
  back?: AppHeaderBack[];
  menu?: AppMenuConfig;
}

function useFallbackProps(): FallbackProps {
  const chrome = useChromeService();

  const breadcrumbs$ = useMemo(() => chrome.project.getBreadcrumbs$(), [chrome]);
  const breadcrumbs = useObservable(breadcrumbs$, []);

  const appMenu$ = useMemo(() => chrome.getAppMenu$(), [chrome]);
  const appMenu = useObservable(appMenu$, undefined);

  const hasLegacyActionMenu = useHasLegacyActionMenu();

  return useMemo(() => {
    const backTargets: AppHeaderBack[] = [];
    for (let i = breadcrumbs.length - 2; i >= 0; i--) {
      const crumb = breadcrumbs[i];
      if (crumb.href) {
        backTargets.push({
          href: crumb.href,
          onClick: crumb.onClick,
          label: getBreadcrumbText(crumb),
        });
      }
    }

    const hasBack = backTargets.length > 0;
    const hasMenu = !!appMenu?.items?.length;
    const hasContent = hasBack || hasMenu || hasLegacyActionMenu;

    return {
      hasContent,
      back: hasBack ? backTargets : undefined,
      menu: hasMenu ? appMenu : undefined,
    };
  }, [breadcrumbs, appMenu, hasLegacyActionMenu]);
}

export function useHasChromeAppHeaderContent(): boolean {
  return useFallbackProps().hasContent;
}

export const ChromeAppHeader = React.memo(() => {
  const { hasContent, back, menu } = useFallbackProps();

  if (!hasContent) return null;

  return <AppHeaderView back={back} menu={menu} sticky={false} padding="m" />;
});

ChromeAppHeader.displayName = 'ChromeAppHeader';
