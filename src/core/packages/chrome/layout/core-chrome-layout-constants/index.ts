/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
export { layoutVar, layoutVarName } from './src/css_variables';
export type {
  LayoutVarName,
  CSSVarName,
  LayoutComponent,
  LayoutProperty,
  ApplicationComponent,
  ApplicationVarName,
} from './src/css_variables';
export { layoutLevels } from './src/levels';

/**
 * The ID of the main scroll container in the application.
 * `document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID)` can be used to find the main scroll container.
 */
export const APP_MAIN_SCROLL_CONTAINER_ID = 'app-main-scroll';

/**
 * The ID of the fixed viewport container in the application.
 * This div is rendered by the `AppFixedViewport` component on the top of the application area and can be used to render fixed elements that should not scroll with the main content.
 */
export const APP_FIXED_VIEWPORT_ID = 'app-fixed-viewport';

/**
 * The ID of the main content container in the application, regardless of the type of the layout used.
 * `document.querySelector(MAIN_CONTENT_SELECTORS.join(','))` can be used to find the main content container.
 *
 * TODO: Potentially allow this to be customizable per-plugin
 */
export const MAIN_CONTENT_SELECTORS = [
  'main', // Ideal target for all plugins using KibanaPageTemplate
  '[role="main"]', // Fallback for plugins using deprecated EuiPageContent
  '.kbnAppWrapper', // Last-ditch fallback for all plugins regardless of page template
];

/**
 * The gap (in pixels) between the secondary side navigation panel and the main app content.
 */
export const SIDE_PANEL_CONTENT_GAP = 8;

/**
 * The selector for elements that should be included in the focus trap of a flyout.
 * This will allow the flyout focus trap to include header and sidenav by default.
 */
export const euiIncludeSelectorInFocusTrap = {
  prop: {
    'data-eui-includes-in-flyout-focus-trap': true,
  },
  selector: `[data-eui-includes-in-flyout-focus-trap="true"]`,
};
