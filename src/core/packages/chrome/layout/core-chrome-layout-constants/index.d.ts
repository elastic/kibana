export { layoutVar, layoutVarName } from './src/css_variables';
export type { LayoutVarName, CSSVarName, LayoutComponent, LayoutProperty, ApplicationComponent, ApplicationVarName, } from './src/css_variables';
export { layoutLevels } from './src/levels';
/**
 * The ID of the main scroll container in the application.
 * `document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID)` can be used to find the main scroll container.
 */
export declare const APP_MAIN_SCROLL_CONTAINER_ID = "app-main-scroll";
/**
 * The ID of the fixed viewport container in the application.
 * This div is rendered by the `AppFixedViewport` component on the top of the application area and can be used to render fixed elements that should not scroll with the main content.
 */
export declare const APP_FIXED_VIEWPORT_ID = "app-fixed-viewport";
/**
 * Selector for an open EuiFlyout. All flyouts (core overlay service, system flyouts,
 * and inline plugin flyouts) render through EuiFlyout which applies this class and role.
 */
export declare const FLYOUT_SELECTOR = ".euiFlyout[role=\"dialog\"]";
/**
 * The ID of the main content container in the application, regardless of the type of the layout used.
 * `document.querySelector(MAIN_CONTENT_SELECTORS.join(','))` can be used to find the main content container.
 *
 * TODO: Potentially allow this to be customizable per-plugin
 */
export declare const MAIN_CONTENT_SELECTORS: string[];
/**
 * The gap (in pixels) between the secondary side navigation panel and the main app content.
 */
export declare const SIDE_PANEL_CONTENT_GAP = 8;
/**
 * The selector for elements that should be included in the focus trap of a flyout.
 * This will allow the flyout focus trap to include header and sidenav by default.
 */
export declare const euiIncludeSelectorInFocusTrap: {
    prop: {
        'data-eui-includes-in-flyout-focus-trap': boolean;
    };
    selector: string;
};
