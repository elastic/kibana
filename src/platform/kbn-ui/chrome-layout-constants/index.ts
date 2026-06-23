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

export const APP_MAIN_SCROLL_CONTAINER_ID = 'app-main-scroll';

/** Default width of the agent workspace column in agent-first chrome (POC). */
export const DEFAULT_AGENT_WIDTH = 480;

export const APP_FIXED_VIEWPORT_ID = 'app-fixed-viewport';

export const FLYOUT_SELECTOR = '.euiFlyout[role="dialog"]';

export const MAIN_CONTENT_SELECTORS = ['main', '[role="main"]', '.kbnAppWrapper'];

export const SIDE_PANEL_CONTENT_GAP = 8;

export const euiIncludeSelectorInFocusTrap = {
  prop: {
    'data-eui-includes-in-flyout-focus-trap': true,
  },
  selector: `[data-eui-includes-in-flyout-focus-trap="true"]`,
};
