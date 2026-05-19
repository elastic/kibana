import type { ChromeBreadcrumb, ChromeGlobalHelpExtensionMenuLink, ChromeHelpExtension, ChromeHelpMenuLink, ChromeNavControl, ChromeNavLink } from '@kbn/core-chrome-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { IBasePath } from '@kbn/core-http-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
/**
 * Returns the current classic breadcrumbs set via `chrome.setBreadcrumbs()`.
 * Used by `ClassicHeader`.
 */
export declare function useClassicBreadcrumbs(): ChromeBreadcrumb[];
/**
 * Returns the current project-style breadcrumbs derived from the active
 * navigation tree node. Used by `ProjectHeader`.
 */
export declare function useProjectBreadcrumbs(): ChromeBreadcrumb[];
/**
 * Returns the project home href derived from the navigation tree.
 * Used by `Logo` (project header).
 */
export declare function useProjectHome(): string;
export declare const LOADING_DEBOUNCE_TIME = 250;
/**
 * Returns `true` when HTTP requests are in flight, debounced to avoid flickering
 * on very short requests.
 */
export declare function useIsLoading(): boolean;
/** Returns `http.basePath` (`IBasePath`). */
export declare function useBasePath(): IBasePath;
/** Returns the classic home href (`/app/home` prepended with basePath). */
export declare function useHomeHref(): string;
/** Returns `application.navigateToUrl`. */
export declare function useNavigateToUrl(): ApplicationStart['navigateToUrl'];
/** Returns the `docLinks` service. */
export declare function useDocLinks(): DocLinksStart;
/** Returns the resolved custom branding state. */
export declare function useCustomBranding(): CustomBranding;
/**
 * Returns the current nav links list.
 * Used by `CollapsibleNav` (classic) and `Navigation` (project sidenav).
 */
export declare function useNavLinks(): ChromeNavLink[];
/**
 * Returns the recently accessed items list.
 * Used by `CollapsibleNav` (classic layout).
 */
export declare function useRecentlyAccessed(): import("@kbn/core-chrome-browser").ChromeRecentlyAccessedHistoryItem[];
/**
 * Returns the current custom nav link (e.g. cloud deployment link).
 * Used by `CollapsibleNav` (classic layout).
 */
export declare function useCustomNavLink(): Partial<ChromeNavLink> | undefined;
export type NavControlPosition = 'left' | 'center' | 'right';
/**
 * Returns the nav controls for a given position.
 * Used by `HeaderNavControls` (instantiated in both classic and project headers).
 */
export declare function useNavControls(position: NavControlPosition): ChromeNavControl[];
interface HelpMenuState {
    menuLinks: ChromeHelpMenuLink[];
    extension: ChromeHelpExtension | undefined;
    supportUrl: string;
    globalExtensionMenuLinks: ChromeGlobalHelpExtensionMenuLink[];
}
/**
 * Returns all help menu state as a single object (single subscription).
 * Used by `HeaderHelpMenu` (instantiated from both classic and project headers).
 */
export declare function useHelpMenu(): HelpMenuState;
/**
 * Returns the current side nav collapsed state and a toggle callback.
 * Used by `GridLayoutProjectSideNav`.
 */
export declare function useSideNavCollapsed(): {
    isCollapsed: boolean;
    toggle: (collapsed: boolean) => void;
};
/**
 * Returns the current app ID from `application.currentAppId$`.
 * Used by `CollapsibleNav` (classic layout).
 */
export declare function useCurrentAppId(): string | undefined;
/**
 * Returns the breadcrumb append extensions (including badge extensions).
 * Used by `BreadcrumbsWithExtensionsWrapper`.
 */
export declare function useBreadcrumbsAppendExtensions(): import("@kbn/core-chrome-browser").ChromeBreadcrumbsAppendExtension[];
/**
 * Returns the current header banner, or `undefined` if none is set.
 * Used by `HeaderTopBanner`.
 */
export declare function useHeaderBanner(): import("@kbn/core-chrome-browser").ChromeUserBanner | undefined;
/**
 * Returns the current app menu config, or `undefined` if none is set.
 * Used by `HeaderAppMenu`.
 */
export declare function useAppMenu(): import("@kbn/core/packages/chrome/app-menu/core-chrome-app-menu-components").AppMenuConfig | undefined;
/**
 * Returns the current legacy action menu mount point, or `undefined` if none is set.
 * @deprecated Legacy action menus use imperative mount points. Prefer `chrome.setAppMenu()`.
 */
export declare function useCurrentActionMenu(): MountPoint | undefined;
/**
 * Whether a legacy action menu mount point is currently set.
 * @deprecated Legacy action menus use imperative mount points. Prefer `chrome.setAppMenu()`.
 */
export declare function useHasLegacyActionMenu(): boolean;
/** Whether the current app menu (registered via `chrome.setAppMenu()`) has items configured. */
export declare function useHasAppMenuConfig(): boolean;
/**
 * Returns `true` when an app menu is currently active — either a legacy action
 * menu mount point (`application.currentActionMenu$`) or a new `AppMenuConfig`
 * registered via `chrome.setAppMenu()`.
 */
export declare function useHasAppMenu(): boolean;
export {};
