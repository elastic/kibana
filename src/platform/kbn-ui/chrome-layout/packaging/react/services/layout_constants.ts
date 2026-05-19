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

export const FLYOUT_SELECTOR = '.euiFlyout[role="dialog"]';

export const MAIN_CONTENT_SELECTORS = ['main', '[role="main"]', '.kbnAppWrapper'];

export const SIDE_PANEL_CONTENT_GAP = 8;

export const euiIncludeSelectorInFocusTrap = {
  prop: {
    'data-eui-includes-in-flyout-focus-trap': true,
  },
  selector: `[data-eui-includes-in-flyout-focus-trap="true"]`,
};

/**
 * CSS variable helpers — re-implemented inline so the bundle does not reach
 * back into the Kibana source tree.
 */
const toKebabCase = (str: string) => str.replace(/([A-Z])/g, '-$1').toLowerCase();

export const layoutVarName = (name: string): string => {
  const isAppVar = name.startsWith('application.') && name.split('.').length === 3;
  if (isAppVar) {
    const parts = name.split('.');
    const component = parts[1];
    const property = parts[2];
    return `--kbn-application--${toKebabCase(component)}-${toKebabCase(property)}`;
  }
  const [component, property] = name.split('.');
  return `--kbn-layout--${component}-${toKebabCase(property)}`;
};

export const layoutVar = (name: string, fallback?: string): string => {
  const varName = layoutVarName(name);
  return fallback ? `var(${varName}, ${fallback})` : `var(${varName})`;
};

export const layoutLevels = {
  content: 0,
  header: 100,
  footer: 100,
  navigation: 999,
  sidebar: 1050,
  banner: 1050,
  applicationTopBar: 100,
  applicationBottomBar: 100,
  debug: 9999,
};
