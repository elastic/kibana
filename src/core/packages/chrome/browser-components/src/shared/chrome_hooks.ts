/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { Observable } from 'rxjs';
import { debounceTime, map } from 'rxjs';
import type {
  ChromeBreadcrumb,
  ChromeNavControl,
  ChromeNavLink,
  ChromeNextHeaderConfig,
} from '@kbn/core-chrome-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { IBasePath } from '@kbn/core-http-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { isNextChrome } from '@kbn/core-chrome-feature-flags';
import { useChromeComponentsDeps } from '../context';

/**
 * Returns the current classic breadcrumbs set via `chrome.setBreadcrumbs()`.
 * Used by `ClassicHeader`.
 */
export function useClassicBreadcrumbs(): ChromeBreadcrumb[] {
  const chrome = useChromeService();
  const breadcrumbs$ = useMemo(() => chrome.getBreadcrumbs$(), [chrome]);
  return useObservable(breadcrumbs$, chrome.getBreadcrumbs());
}

/**
 * Returns the current project-style breadcrumbs derived from the active
 * navigation tree node. Used by `ProjectHeader`.
 */
export function useProjectBreadcrumbs(): ChromeBreadcrumb[] {
  const chrome = useChromeService();
  const breadcrumbs$ = useMemo(() => chrome.project.getBreadcrumbs$(), [chrome]);
  return useObservable(breadcrumbs$, []);
}

/**
 * Returns the project home href derived from the navigation tree.
 * Used by `Logo` (project header).
 */
export function useProjectHome(): string {
  const chrome = useChromeService();
  const projectHome$ = useMemo(() => chrome.project.getProjectHome$(), [chrome]);
  return useObservable(projectHome$, '/app/home');
}

export const LOADING_DEBOUNCE_TIME = 250;

/**
 * Returns `true` when HTTP requests are in flight, debounced to avoid flickering
 * on very short requests.
 */
export function useIsLoading(): boolean {
  const { http } = useChromeComponentsDeps();
  const isLoading$ = useMemo(
    () =>
      http.getLoadingCount$().pipe(
        debounceTime(LOADING_DEBOUNCE_TIME),
        map((c) => c > 0)
      ),
    [http]
  );
  return useObservable(isLoading$, false);
}

/** Returns `http.basePath` (`IBasePath`). */
export function useBasePath(): IBasePath {
  return useChromeComponentsDeps().http.basePath;
}

/** Returns the classic home href (`/app/home` prepended with basePath). */
export function useHomeHref(): string {
  return useBasePath().prepend('/app/home');
}

/** Returns `application.navigateToUrl`. */
export function useNavigateToUrl(): ApplicationStart['navigateToUrl'] {
  return useChromeComponentsDeps().application.navigateToUrl;
}

/** Returns the `docLinks` service. */
export function useDocLinks(): DocLinksStart {
  return useChromeComponentsDeps().docLinks;
}

/** Returns the resolved custom branding state. */
export function useCustomBranding(): CustomBranding {
  const { customBranding } = useChromeComponentsDeps();
  return useObservable(customBranding.customBranding$, {});
}

/**
 * Returns the current nav links list.
 * Used by `CollapsibleNav` (classic) and `Navigation` (project sidenav).
 */
export function useNavLinks(): ChromeNavLink[] {
  const chrome = useChromeService();
  const navLinks$ = useMemo(() => chrome.navLinks.getNavLinks$(), [chrome]);
  return useObservable(navLinks$, []);
}

/**
 * Returns the recently accessed items list.
 * Used by `CollapsibleNav` (classic layout).
 */
export function useRecentlyAccessed() {
  const chrome = useChromeService();
  const recentlyAccessed$ = useMemo(() => chrome.recentlyAccessed.get$(), [chrome]);
  return useObservable(recentlyAccessed$, []);
}

/**
 * Returns the current custom nav link (e.g. cloud deployment link).
 * Used by `CollapsibleNav` (classic layout).
 */
export function useCustomNavLink() {
  const chrome = useChromeService();
  const customNavLink$ = useMemo(() => chrome.getCustomNavLink$(), [chrome]);
  return useObservable(customNavLink$, undefined);
}

export type NavControlPosition = 'left' | 'center' | 'right';

const navControlGetters: Record<
  NavControlPosition,
  (chrome: ReturnType<typeof useChromeService>) => Observable<ChromeNavControl[]>
> = {
  left: (chrome) => chrome.navControls.getLeft$(),
  center: (chrome) => chrome.navControls.getCenter$(),
  right: (chrome) => chrome.navControls.getRight$(),
};

/**
 * Returns the nav controls for a given position.
 * Used by `HeaderNavControls` (instantiated in both classic and project headers).
 */
export function useNavControls(position: NavControlPosition): ChromeNavControl[] {
  const chrome = useChromeService();
  const controls$ = useMemo(() => navControlGetters[position](chrome), [chrome, position]);
  return useObservable(controls$, []);
}

/**
 * Returns the current side nav collapsed state and a toggle callback.
 * Used by `GridLayoutProjectSideNav`.
 */
export function useSideNavCollapsed(): {
  isCollapsed: boolean;
  toggle: (collapsed: boolean) => void;
} {
  const chrome = useChromeService();
  const collapsed$ = useMemo(() => chrome.sideNav.getIsCollapsed$(), [chrome]);
  const isCollapsed = useObservable(collapsed$, chrome.sideNav.getIsCollapsed());
  return { isCollapsed, toggle: chrome.sideNav.setIsCollapsed };
}

/**
 * Returns the current app ID from `application.currentAppId$`.
 * Used by `CollapsibleNav` (classic layout).
 */
export function useCurrentAppId(): string | undefined {
  const { application } = useChromeComponentsDeps();
  return useObservable(application.currentAppId$, undefined);
}

/**
 * Returns the breadcrumb append extensions (including badge extensions).
 * Used by `BreadcrumbsWithExtensionsWrapper`.
 */
export function useBreadcrumbsAppendExtensions() {
  const chrome = useChromeService();
  const extensions$ = useMemo(() => chrome.getBreadcrumbsAppendExtensionsWithBadges$(), [chrome]);
  return useObservable(extensions$, []);
}

/**
 * Returns the current header banner, or `undefined` if none is set.
 * Used by `HeaderTopBanner`.
 */
export function useHeaderBanner() {
  const chrome = useChromeService();
  const headerBanner$ = useMemo(() => chrome.getHeaderBanner$(), [chrome]);
  return useObservable(headerBanner$, undefined);
}

/**
 * Returns the current app menu config, or `undefined` if none is set.
 * Used by `HeaderAppMenu`.
 */
export function useAppMenu() {
  const chrome = useChromeService();
  const appMenu$ = useMemo(() => chrome.getAppMenu$(), [chrome]);
  return useObservable(appMenu$, undefined);
}

/**
 * Returns the current legacy action menu mount point, or `undefined` if none is set.
 * @deprecated Legacy action menus use imperative mount points. Prefer `chrome.setAppMenu()`.
 */
export function useCurrentActionMenu(): MountPoint | undefined {
  const { application } = useChromeComponentsDeps();
  return useObservable(application.currentActionMenu$, undefined);
}

/**
 * Whether a legacy action menu mount point is currently set.
 * @deprecated Legacy action menus use imperative mount points. Prefer `chrome.setAppMenu()`.
 */
export function useHasLegacyActionMenu(): boolean {
  return !!useCurrentActionMenu();
}

/** Whether the current app menu (registered via `chrome.setAppMenu()`) has items configured. */
export function useHasAppMenuConfig(): boolean {
  const config = useAppMenu();
  return !!config?.items?.length;
}

/**
 * Returns `true` when an app menu is currently active — either a legacy action
 * menu mount point (`application.currentActionMenu$`) or a new `AppMenuConfig`
 * registered via `chrome.setAppMenu()`.
 */
export function useHasAppMenu(): boolean {
  const hasLegacyActionMenu = useHasLegacyActionMenu();
  const hasAppMenuConfig = useHasAppMenuConfig();
  return hasLegacyActionMenu || hasAppMenuConfig;
}

/**
 * Returns the current Chrome-Next header configuration set via
 * `chrome.next.header.set()`, or `undefined` if not set.
 * Used by Chrome-Next top bar components.
 */
export function useNextHeader(): ChromeNextHeaderConfig | undefined {
  const chrome = useChromeService();
  const config$ = useMemo(() => chrome.next.header.get$(), [chrome]);
  return useObservable(config$, undefined);
}

export function useUserMenu(): ReactNode {
  const chrome = useChromeService();
  const content$ = useMemo(() => chrome.next.userMenu.get$(), [chrome]);
  return useObservable(content$, null);
}

/** Returns whether the next-chrome experience is enabled via feature flag. */
export function useIsNextChrome(): boolean {
  const { featureFlags } = useChromeComponentsDeps();
  return isNextChrome(featureFlags);
}
