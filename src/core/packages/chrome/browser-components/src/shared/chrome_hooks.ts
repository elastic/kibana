/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { combineLatest, debounceTime, map, of } from 'rxjs';
import type { Observable } from 'rxjs';
import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { sortBy } from 'lodash';
import type {
  ChromeBreadcrumb,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeNavControl,
  ChromeNavControlProjectChrome,
  ChromeNavLink,
} from '@kbn/core-chrome-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { IBasePath } from '@kbn/core-http-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
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
 * navigation tree node. Used by the project AppBar title.
 */
export function useProjectBreadcrumbs(): ChromeBreadcrumb[] {
  const chrome = useChromeService();
  const breadcrumbs$ = useMemo(() => chrome.project.getBreadcrumbs$(), [chrome]);
  return useObservable(breadcrumbs$, []);
}

/**
 * Space switcher crumb for project header (not part of {@link useProjectBreadcrumbs}).
 */
export function useSpaceSwitcherBreadcrumb(): ChromeBreadcrumb | undefined {
  const chrome = useChromeService();
  const crumb$ = useMemo((): Observable<ChromeBreadcrumb | undefined> => {
    const get$ = chrome.project.getSpaceSwitcherBreadcrumb$;
    return typeof get$ === 'function' ? get$() : of(undefined);
  }, [chrome]);
  const initial = useMemo(() => {
    const get = chrome.project.getSpaceSwitcherBreadcrumb;
    return typeof get === 'function' ? get() : undefined;
  }, [chrome]);
  return useObservable(crumb$, initial);
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

const getProjectChromePlacement = (control: ChromeNavControl): ChromeNavControlProjectChrome =>
  control.projectChrome ?? 'appBar';

/**
 * Returns the nav controls for a given position.
 * Used by `HeaderNavControls` (instantiated in both classic and project headers).
 */
export function useNavControls(position: NavControlPosition): ChromeNavControl[] {
  const chrome = useChromeService();
  const controls$ = useMemo(() => {
    const base$ = navControlGetters[position](chrome);
    if (position !== 'right') {
      return base$;
    }
    return base$.pipe(
      map((controls) => controls.filter((c) => getProjectChromePlacement(c) !== 'helpMenuExtras'))
    );
  }, [chrome, position]);
  return useObservable(controls$, []);
}

/**
 * Right-side nav controls filtered by {@link ChromeNavControl.projectChrome} for project layout.
 */
export function useProjectChromeRightControls(
  placement: ChromeNavControlProjectChrome
): ChromeNavControl[] {
  const chrome = useChromeService();
  const controls$ = useMemo(
    () =>
      chrome.navControls.getRight$().pipe(
        map((controls) =>
          sortBy(
            controls.filter((c) => getProjectChromePlacement(c) === placement),
            'order'
          )
        )
      ),
    [chrome, placement]
  );
  return useObservable(controls$, []);
}

/**
 * Right-side nav controls for the project global header (first bar): every `projectChrome`
 * placement except `appBar` (application top bar / second row) and `helpMenuExtras`
 * (rendered inside the help menu popover).
 */
export function useProjectHeaderRightNavControls(): ChromeNavControl[] {
  const chrome = useChromeService();
  const controls$ = useMemo(
    () =>
      chrome.navControls.getRight$().pipe(
        map((controls) =>
          sortBy(
            controls.filter((c) => {
              const placement = getProjectChromePlacement(c);
              return placement !== 'appBar' && placement !== 'helpMenuExtras';
            }),
            'order'
          )
        )
      ),
    [chrome]
  );
  return useObservable(controls$, []);
}

/**
 * Right-side nav controls shown in the Help menu popover (`projectChrome: 'helpMenuExtras'`).
 */
export function useHelpMenuExtrasNavControls(): ChromeNavControl[] {
  return useProjectChromeRightControls('helpMenuExtras');
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

/** Returns the list of globally registered overflow items (persist across app navigation). */
export function useGlobalOverflowItems(): AppMenuItemType[] {
  const chrome = useChromeService();
  const globalOverflowItems$ = useMemo(() => chrome.project.getGlobalOverflowItems$(), [chrome]);
  return useObservable(globalOverflowItems$, []);
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

/**
 * Whether the current app menu (registered via `chrome.setAppMenu()`) has any actions.
 * Matches AppMenuComponent: `items`, `primaryActionItem`, `secondaryActionItem`,
 * chromeBarV2 fields (`secondaryActionItems`, `overflowOnlyItems`), and `headerTabs`.
 */
export function useHasAppMenuConfig(): boolean {
  const config = useAppMenu();
  if (!config) {
    return false;
  }
  return Boolean(
    (config.items && config.items.length > 0) ||
      config.primaryActionItem ||
      config.secondaryActionItem ||
      (config.headerTabs && config.headerTabs.length > 0) ||
      (config.layout === 'chromeBarV2' &&
        ((config.secondaryActionItems?.length ?? 0) > 0 ||
          (config.overflowOnlyItems?.length ?? 0) > 0))
  );
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
