/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';
import { getPageColorMode } from './get_page_color_mode';
import { toHex } from './color_token_lookup';
import { CSS_VAR_PREFIX, DEVTOOL_TOKEN_VARS_ATTR } from '../constants';

const STYLE_SELECTOR = `style[${DEVTOOL_TOKEN_VARS_ATTR}]`;

const findStyleEl = (): HTMLStyleElement | null =>
  document.head.querySelector<HTMLStyleElement>(STYLE_SELECTOR);

/**
 * Build a CSS custom-property reference for a given EUI token name.
 * Example: `getTokenVar('textParagraph')` → `'var(--dt-textParagraph)'`
 *
 * The fallback hex is included so the value still resolves if the
 * stylesheet hasn't been injected yet (e.g. in detached DOM).
 *
 * @param tokenName - The EUI token name.
 * @param fallbackHex - Optional fallback hex value.
 * @returns A CSS `var()` reference string.
 */
export const getTokenVar = (tokenName: string, fallbackHex?: string): string => {
  const fallback = fallbackHex ? `, ${fallbackHex}` : '';
  return `var(${CSS_VAR_PREFIX}${tokenName}${fallback})`;
};

/**
 * Extracts the token name from a CSS `var(--dt-…)` value.
 * Returns `undefined` if the value is not a design-tool CSS var.
 *
 * @param value - The CSS value to parse.
 * @returns The token name, or `undefined`.
 */
export const parseTokenVar = (value: string): string | undefined => {
  const match = value.match(/^var\(--dt-([^,)]+)/);
  return match?.[1];
};

/**
 * Inject or update the `<style>` element with CSS custom properties
 * for every EUI color token in the current color mode.
 *
 * All clones that use `var(--dt-*)` inline styles will automatically
 * pick up the new values via the CSS cascade, no DOM walk needed.
 */
export const syncTokenStylesheet = (): void => {
  const mode = getPageColorMode();
  const existing = findStyleEl();

  if (existing?.dataset.devtoolColorMode === mode) return;

  const themeColors = EuiThemeBorealis.root.colors as unknown as Record<string, unknown>;
  const palette = (mode === 'dark' ? themeColors.DARK : themeColors.LIGHT) as Record<
    string,
    unknown
  >;

  const declarations: string[] = [];
  for (const [key, value] of Object.entries(palette)) {
    if (typeof value !== 'string') continue;
    const hex = toHex(value);
    if (hex) {
      declarations.push(`${CSS_VAR_PREFIX}${key}: ${hex};`);
    }
  }

  const css = `:root { ${declarations.join(' ')} }`;
  const el = existing ?? document.createElement('style');

  if (!existing) {
    el.setAttribute(DEVTOOL_TOKEN_VARS_ATTR, '');
    document.head.appendChild(el);
  }

  el.textContent = css;
  el.dataset.devtoolColorMode = mode;
};
