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
import { combineLatest, debounceTime, map } from 'rxjs';
import type { Observable } from 'rxjs';
import type {
  ChromeBreadcrumb,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeNavControl,
  ChromeNavLink,
  GlobalSearchConfig,
} from '@kbn/core-chrome-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { IBasePath } from '@kbn/core-http-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useChromeComponentsDeps } from '../context';

export { useIsNextChrome } from '@kbn/core-chrome-browser-hooks';

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

interface HelpMenuState {
  menuLinks: ChromeHelpMenuLink[];
  extension: ChromeHelpExtension | undefined;
  supportUrl: string;
  globalExtensionMenuLinks: ChromeGlobalHelpExtensionMenuLink[];
}

const INITIAL_HELP_MENU: HelpMenuState = {
  menuLinks: [],
  extension: undefined,
  supportUrl: '',
  globalExtensionMenuLinks: [],
};

/**
 * Returns all help menu state as a single object (single subscription).
 * Used by `HeaderHelpMenu` (instantiated from both classic and project headers).
 */
export function useHelpMenu(): HelpMenuState {
  const chrome = useChromeService();
  const helpMenu$ = useMemo(
    () =>
      combineLatest([
        chrome.getHelpMenuLinks$(),
        chrome.getHelpExtension$(),
        chrome.getHelpSupportUrl$(),
        chrome.getGlobalHelpExtensionMenuLinks$(),
      ]).pipe(
        map(([menuLinks, extension, supportUrl, globalExtensionMenuLinks]) => ({
          menuLinks,
          extension,
          supportUrl,
          globalExtensionMenuLinks,
        }))
      ),
    [chrome]
  );
  return useObservable(helpMenu$, INITIAL_HELP_MENU);
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
 * Whether a legacy action menu mount point is currently set.
 * @deprecated Legacy action menus use imperative mount points. Prefer `chrome.setAppMenu()`.
 */
export function useHasLegacyActionMenu(): boolean {
  return !!useInternalLegacyActionMenu();
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
 * Returns the current global search configuration, or `undefined` if none is set.
 * Used by `SearchButton` (global header).
 */
export function useGlobalSearch(): GlobalSearchConfig | undefined {
  const chrome = useChromeService();
  const config$ = useMemo(() => chrome.next.globalSearch.get$(), [chrome]);
  return useObservable(config$, undefined);
}

/**
 * Returns the current context switcher content set via
 * `chrome.next.contextSwitcher.set()`, or null if not set.
 */
export function useContextSwitcher(): ReactNode {
  const chrome = useChromeService();
  const content$ = useMemo(() => chrome.next.contextSwitcher.get$(), [chrome]);
  return useObservable(content$, null);
}

/** Whether an inline `AppHeader` is currently mounted by the active app. */
export function useHasInlineAppHeader(): boolean {
  const chrome = useChromeService();
  const inlineAppHeader$ = useMemo(() => chrome.next.inlineAppHeader.get$(), [chrome]);
  return useObservable(inlineAppHeader$, false);
}

export function useInternalBasePath(): IBasePath {
  return useChromeService().componentDeps.basePath;
}

export function useInternalLegacyActionMenu(): MountPoint | undefined {
  const { legacyActionMenu$ } = useChromeService().componentDeps;
  return useObservable(legacyActionMenu$, undefined);
}

export function useInternalHasLegacyActionMenu(): boolean {
  return !!useInternalLegacyActionMenu();
}

/**
 * Like {@link useHasAppMenu} but legacy menu reads {@link useChromeService}.componentDeps
 * instead of {@link useChromeComponentsDeps}. Safe where only ChromeServiceProvider exists
 * (e.g. management apps rendering AppHeader inline).
 */
export function useInternalHasAppMenu(): boolean {
  const hasLegacy = useInternalHasLegacyActionMenu();
  const hasConfig = useHasAppMenuConfig();
  return hasLegacy || hasConfig;
}

/**
 * Returns the current user menu content set via
 * `chrome.next.userMenu.set()`, or null if not set.
 */
export function useUserMenu(): ReactNode {
  const chrome = useChromeService();
  const content$ = useMemo(() => chrome.next.userMenu.get$(), [chrome]);
  return useObservable(content$, null);
}
