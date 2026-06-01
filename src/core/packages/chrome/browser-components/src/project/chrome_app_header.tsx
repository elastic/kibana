/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, useMemo, useState, useLayoutEffect } from 'react';
import type { ChromeBreadcrumb, AppHeaderBack, AppHeaderConfig } from '@kbn/core-chrome-browser';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useObservable } from '@kbn/use-observable';

import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { useLayoutUpdate } from '@kbn/ui-chrome-layout';
import { useHasLegacyActionMenu } from '../shared/chrome_hooks';

const AppHeaderViewLazy = React.lazy(async () => {
  const { AppHeaderView } = await import('@kbn/app-header');
  return { default: AppHeaderView };
});

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
  const legacyBadge$ = useMemo(() => chrome.getBadge$(), [chrome]);
  const legacyBadge = useObservable(legacyBadge$, undefined);
  const breadcrumbsBadges$ = useMemo(() => chrome.getBreadcrumbsBadges$(), [chrome]);
  const breadcrumbsBadges = useObservable(breadcrumbsBadges$, []);

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
    const hasBadges = !!legacyBadge || breadcrumbsBadges.length > 0;
    const hasContent = hasBack || hasMenu || hasBadges || hasLegacyActionMenu;

    return {
      hasContent,
      back: hasBack ? backTargets : undefined,
      menu: hasMenu ? appMenu : undefined,
    };
  }, [breadcrumbs, appMenu, legacyBadge, breadcrumbsBadges, hasLegacyActionMenu]);
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
    !!config.menu?.items?.length ||
    !!config.favorite ||
    !!config.metadata?.length
  );
}

export function useHasChromeAppHeaderContent(): boolean {
  const config = useAppHeaderConfig();
  const fallback = useFallbackProps();
  return hasExplicitAppHeaderContent(config) || fallback.hasContent;
}

function useMeasuredAppHeaderHeight(): React.RefCallback<HTMLDivElement> {
  const updateLayout = useLayoutUpdate();
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!el) return;

    updateLayout({ applicationTopBarHeight: el.offsetHeight });

    const ro = new ResizeObserver(([entry]) => {
      const h = entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight;
      updateLayout({ applicationTopBarHeight: h });
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [el, updateLayout]);

  return setEl;
}

export const ChromeAppHeaderRenderer = React.memo(() => {
  const config = useAppHeaderConfig();
  const fallback = useFallbackProps();

  const hasContent = hasExplicitAppHeaderContent(config) || fallback.hasContent;
  const measureRef = useMeasuredAppHeaderHeight();

  if (!hasContent) return null;

  return (
    <div ref={measureRef}>
      <Suspense fallback={null}>
        <AppHeaderViewLazy
          title={config?.title}
          back={config?.back ?? fallback.back}
          tabs={config?.tabs}
          badges={config?.badges}
          menu={config?.menu ?? fallback.menu}
          favorite={config?.favorite}
          metadata={config?.metadata}
          sticky={false}
          padding="m"
        />
      </Suspense>
    </div>
  );
});

ChromeAppHeaderRenderer.displayName = 'ChromeAppHeaderRenderer';
