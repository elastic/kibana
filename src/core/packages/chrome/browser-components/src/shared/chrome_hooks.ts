/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { combineLatest, map } from 'rxjs';
import type { Observable } from 'rxjs';
import type {
  ChromeBreadcrumb,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeNavControl,
  ChromeNavLink,
} from '@kbn/core-chrome-browser';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useChromeComponentsDeps } from '../context';

/**
 * Returns the current classic breadcrumbs set via `chrome.setBreadcrumbs()`.
 * Used by `HeaderBreadcrumbs` and `HeaderPageAnnouncer` (classic layout).
 */
export function useBreadcrumbs(): ChromeBreadcrumb[] {
  const chrome = useChromeService();
  return useObservable(chrome.getBreadcrumbs$(), chrome.getBreadcrumbs());
}

/**
 * Returns the current project-style breadcrumbs derived from the active
 * navigation tree node. Used by `Breadcrumbs` and `HeaderPageAnnouncer`
 * (project layout).
 */
export function useProjectBreadcrumbs(): ChromeBreadcrumb[] {
  const chrome = useChromeService();
  return useObservable(chrome.project.getBreadcrumbs$(), []);
}

/**
 * Returns the current nav links list.
 * Used by `CollapsibleNav` (classic) and `Navigation` (project sidenav).
 */
export function useNavLinks(): ChromeNavLink[] {
  const chrome = useChromeService();
  return useObservable(chrome.navLinks.getNavLinks$(), []);
}

type NavControlPosition = 'left' | 'center' | 'right' | 'extension';

const navControlGetters: Record<
  NavControlPosition,
  (chrome: ReturnType<typeof useChromeService>) => Observable<ChromeNavControl[]>
> = {
  left: (chrome) => chrome.navControls.getLeft$(),
  center: (chrome) => chrome.navControls.getCenter$(),
  right: (chrome) => chrome.navControls.getRight$(),
  extension: (chrome) => chrome.navControls.getExtension$(),
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
 * Whether a legacy action menu mount point is currently set.
 * @deprecated Legacy action menus use imperative mount points. Prefer `chrome.setAppMenu()`.
 */
export function useHasLegacyActionMenu(): boolean {
  const { application } = useChromeComponentsDeps();
  return !!useObservable(application.currentActionMenu$, undefined);
}

/** Whether the current app menu (registered via `chrome.setAppMenu()`) has items configured. */
export function useHasAppMenuConfig(): boolean {
  const { appMenu$ } = useChromeComponentsDeps();
  const hasConfig$ = useMemo(
    () => appMenu$.pipe(map((config) => !!config && !!config.items && config.items.length > 0)),
    [appMenu$]
  );
  return useObservable(hasConfig$, false);
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
