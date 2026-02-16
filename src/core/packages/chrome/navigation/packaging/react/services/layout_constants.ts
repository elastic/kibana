/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Stub for `@kbn/core-chrome-layout-constants`.
 *
 * Provides the same constants exported by the Kibana package so that source
 * files can be bundled without modification. Consumers of the standalone
 * package should ensure their application provides matching DOM elements.
 */

export const APP_MAIN_SCROLL_CONTAINER_ID = 'app-main-scroll';

export const APP_FIXED_VIEWPORT_ID = 'app-fixed-viewport';

export const MAIN_CONTENT_SELECTORS = ['main', '[role="main"]', '.kbnAppWrapper'];

export const SIDE_PANEL_CONTENT_GAP = 8;

export const euiIncludeSelectorInFocusTrap = {
  prop: {
    'data-eui-includes-in-flyout-focus-trap': true,
  },
  selector: `[data-eui-includes-in-flyout-focus-trap="true"]`,
};

/**
 * No-op stubs for CSS variable helpers that are not needed outside Kibana.
 */
export const layoutVar = (_component: string, _property: string) => '';
export const layoutVarName = (_component: string, _property: string) => '';
export const layoutLevels = {};
