/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { ChromeBreadcrumb, AppHeaderConfig } from '@kbn/core-chrome-browser';
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

function useAppHeaderConfig(): AppHeaderConfig | undefined {
  const chrome = useChromeService();
  const config$ = useMemo(() => chrome.next.appHeader.get$(), [chrome]);
  return useObservable(config$, undefined);
}

function hasExplicitAppHeaderContent(config: AppHeaderConfig | undefined): boolean {
  if (!config) return false;
  return (
    config.title !== undefined ||
    config.back !== undefined ||
    !!config.tabs?.length ||
    !!config.badges?.length ||
    config.menu !== undefined ||
    config.onShare !== undefined ||
    config.favorite !== undefined
  );
}

export function useHasChromeAppHeaderContent(): boolean {
  const config = useAppHeaderConfig();
  const fallback = useFallbackProps();
  return hasExplicitAppHeaderContent(config) || fallback.hasContent;
}

export const ChromeAppHeaderRenderer = React.memo(() => {
  const config = useAppHeaderConfig();
  const fallback = useFallbackProps();

  const hasContent = hasExplicitAppHeaderContent(config) || fallback.hasContent;
  if (!hasContent) return null;

  return (
    <AppHeaderView
      title={config?.title}
      back={config?.back ?? fallback.back}
      tabs={config?.tabs}
      badges={config?.badges}
      menu={config?.menu ?? fallback.menu}
      onShare={config?.onShare}
      favorite={config?.favorite}
      sticky={false}
      padding="m"
    />
  );
});

ChromeAppHeaderRenderer.displayName = 'ChromeAppHeaderRenderer';
