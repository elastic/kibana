/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { layoutVar, layoutVarName } from './css_variables';
export type {
  LayoutVarName,
  CSSVarName,
  LayoutComponent,
  LayoutProperty,
  ApplicationComponent,
  ApplicationVarName,
} from './css_variables';
export { layoutLevels } from './levels';

export const APP_MAIN_SCROLL_CONTAINER_ID = 'app-main-scroll';

export const FLYOUT_SELECTOR = '.euiFlyout[role="dialog"]';

export const MAIN_CONTENT_SELECTORS = ['main', '[role="main"]', `#${APP_MAIN_SCROLL_CONTAINER_ID}`];

export const SIDE_PANEL_CONTENT_GAP = 8;

export const euiIncludeSelectorInFocusTrap = {
  prop: {
    'data-eui-includes-in-flyout-focus-trap': true,
  },
  selector: `[data-eui-includes-in-flyout-focus-trap="true"]`,
};
