import type { ReactNode } from 'react';
import type { Observable } from 'rxjs';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { ChromeBadge, ChromeBreadcrumb, ChromeBreadcrumbsAppendExtension, ChromeBreadcrumbsBadge, ChromeGlobalHelpExtensionMenuLink, ChromeHelpExtension, GlobalSearchConfig, ChromeNavLink, GlobalHeaderAiButton, ChromeUserBanner, AppHeaderConfig } from '@kbn/core-chrome-browser';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { type State, type ArrayState } from './state_helpers';
import { type VisibilityState } from './visibility_state';
import { type ChromeStyleState } from './chrome_style_state';
export interface ChromeState {
    /** Visibility management */
    visibility: VisibilityState;
    /** Chrome style */
    style: ChromeStyleState;
    /** Side navigation state */
    sideNav: {
        collapsed: State<boolean>;
        width: State<number>;
    };
    /** Breadcrumbs state (includes legacy badge from setBadge()) */
    breadcrumbs: {
        classic: ArrayState<ChromeBreadcrumb>;
        appendExtensions: ArrayState<ChromeBreadcrumbsAppendExtension>;
        badges: ArrayState<ChromeBreadcrumbsBadge>;
        legacyBadge: State<ChromeBadge | undefined>;
        appendExtensionsWithBadges$: Observable<ChromeBreadcrumbsAppendExtension[]>;
    };
    /** UI elements */
    headerBanner: State<ChromeUserBanner | undefined>;
    globalFooter: State<ReactNode>;
    aiButton: State<ReadonlySet<GlobalHeaderAiButton>>;
    globalSearch: State<GlobalSearchConfig | undefined>;
    customNavLink: State<ChromeNavLink | undefined>;
    appMenu: State<AppMenuConfig | undefined>;
    contextSwitcher: State<ReactNode>;
    inlineAppHeader: State<boolean>;
    appHeader: State<AppHeaderConfig | undefined>;
    userMenu: State<ReactNode>;
    /** Help system */
    help: {
        extension: State<ChromeHelpExtension | undefined>;
        supportUrl: State<string>;
        globalMenuLinks: ArrayState<ChromeGlobalHelpExtensionMenuLink>;
    };
    /** Feedback handler registered by the feedback plugin */
    feedbackHandler: State<(() => void) | undefined>;
    /** Newsfeed handler registered by the newsfeed plugin */
    newsfeedHandler: State<{
        open: () => void;
        hasNew$: Observable<boolean>;
    } | undefined>;
}
export interface ChromeStateDeps {
    application: InternalApplicationStart;
    docLinks: DocLinksStart;
}
/** Creates all chrome state in one place */
export declare function createChromeState({ application, docLinks }: ChromeStateDeps): ChromeState;
