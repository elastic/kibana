/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rgbToHex } from '@elastic/eui';
import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';
import { CSS_VAR_PREFIX } from '../constants';
import { getPageColorMode } from './get_page_color_mode';
import { isTransparentColor } from './is_transparent_color';
import { getTokenVar, parseTokenVar, syncTokenStylesheet } from './color_token_stylesheet';

type TokenCategory = 'text' | 'background' | 'border' | 'other';

/**
 * Override map for tokens whose names don't follow the standard
 * `text*` / `background*` prefix convention.
 */
const CATEGORY_OVERRIDES: ReadonlyMap<string, TokenCategory> = new Map([
  ['title', 'text'],
  ['link', 'text'],
  ['primaryText', 'text'],
  ['accentText', 'text'],
  ['successText', 'text'],
  ['warningText', 'text'],
  ['dangerText', 'text'],
  ['subduedText', 'text'],
  ['disabledText', 'text'],
  ['body', 'background'],
  ['emptyShade', 'background'],
  ['lightestShade', 'background'],
  ['lightShade', 'background'],
]);

const classifyToken = (name: string): TokenCategory => {
  const override = CATEGORY_OVERRIDES.get(name);
  if (override) return override;
  if (name.startsWith('text')) return 'text';
  if (name.startsWith('background')) return 'background';
  if (name.startsWith('border')) return 'border';
  return 'other';
};

/**
 * Returns true if the token is classified as a text color.
 *
 * @param name - The EUI color token name.
 * @returns Whether the token is a text color.
 */
export const isTextToken = (name: string): boolean => classifyToken(name) === 'text';
/**
 * Returns true if the token is classified as a background color.
 *
 * @param name - The EUI color token name.
 * @returns Whether the token is a background color.
 */
export const isBgToken = (name: string): boolean => classifyToken(name) === 'background';
/**
 * Returns true if the token is classified as a border color.
 *
 * @param name - The EUI color token name.
 * @returns Whether the token is a border color.
 */
export const isBorderToken = (name: string): boolean => classifyToken(name) === 'border';

/**
 * Normalises any CSS color string to a lowercase hex value.
 * Returns `null` for non-color values or fully-transparent values.
 *
 * @param value - The CSS color string to normalise.
 * @returns Lowercase hex string, or `null`.
 */
export const toHex = (value: string): string | null => {
  if (isTransparentColor(value)) return null;
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
    if (value.length === 9 && value.toLowerCase().endsWith('00')) return null;
    return value.toLowerCase();
  }
  if (value.startsWith('rgb')) {
    try {
      return rgbToHex(value).toLowerCase();
    } catch {
      return null;
    }
  }
  return null;
};

/** Tokens that must never match `background-color`. */
const BG_DENY_TOKENS: ReadonlySet<string> = new Set(['shadow']);

/** CSS properties whose computed values are theme-dependent colors. */
const COLOR_CSS_PROPS: ReadonlySet<string> = new Set([
  'color',
  '-webkit-text-fill-color',
  '-webkit-text-stroke-color',
  'background-color',
]);

const isBorderColorProp = (prop: string): boolean =>
  prop.startsWith('border-') && prop.endsWith('-color');

interface TokenLookup {
  readonly forward: ReadonlyMap<string, string>;
  readonly textReverse: ReadonlyMap<string, string>;
  readonly bgReverse: ReadonlyMap<string, string>;
  readonly borderReverse: ReadonlyMap<string, string>;
  readonly fallbackReverse: ReadonlyMap<string, string>;
}

const buildLookup = (): TokenLookup => {
  const mode = getPageColorMode();
  const themeColors = EuiThemeBorealis.root.colors;
  const palette = mode === 'dark' ? themeColors.DARK : themeColors.LIGHT;

  const forward = new Map<string, string>();
  const textReverse = new Map<string, string>();
  const bgReverse = new Map<string, string>();
  const borderReverse = new Map<string, string>();
  const fallbackReverse = new Map<string, string>();

  for (const [key, value] of Object.entries(palette)) {
    if (typeof value !== 'string') continue;
    const hex = toHex(value);
    if (!hex) continue;
    forward.set(key, hex);

    const category = classifyToken(key);
    if (category === 'text' && !textReverse.has(hex)) textReverse.set(hex, key);
    else if (category === 'background' && !bgReverse.has(hex)) bgReverse.set(hex, key);
    else if (category === 'border' && !borderReverse.has(hex)) borderReverse.set(hex, key);
    if (!fallbackReverse.has(hex)) fallbackReverse.set(hex, key);
  }

  syncTokenStylesheet();
  return { forward, textReverse, bgReverse, borderReverse, fallbackReverse };
};

const getLookup = (() => {
  let cache: TokenLookup | null = null;
  let cachedMode: string | null = null;
  return (): TokenLookup => {
    const mode = getPageColorMode();
    if (!cache || mode !== cachedMode) {
      cache = buildLookup();
      cachedMode = mode;
    }
    return cache;
  };
})();

/**
 * Resolves a CSS color value to its matching EUI theme token name.
 *
 * @param cssValue - The raw CSS color value (hex, rgb, etc.).
 * @param cssProp - The CSS property name for context-aware lookup.
 * @returns The matching token name, or `undefined` if no match.
 */
export const colorToToken = (cssValue: string, cssProp: string): string | undefined => {
  const { textReverse, bgReverse, borderReverse, fallbackReverse } = getLookup();
  const hex = toHex(cssValue);
  if (!hex) return undefined;

  if (cssProp === 'background-color') {
    const bgToken = bgReverse.get(hex);
    if (bgToken) return bgToken;
    const fb = fallbackReverse.get(hex);
    return fb && !BG_DENY_TOKENS.has(fb) ? fb : undefined;
  }
  if (
    cssProp === 'color' ||
    cssProp === '-webkit-text-fill-color' ||
    cssProp === '-webkit-text-stroke-color'
  ) {
    return textReverse.get(hex) ?? fallbackReverse.get(hex);
  }
  if (isBorderColorProp(cssProp)) {
    return borderReverse.get(hex) ?? fallbackReverse.get(hex);
  }
  return fallbackReverse.get(hex);
};

const tokenToColor = (token: string): string | undefined => getLookup().forward.get(token);

/**
 * For each color-bearing CSS property on `clone`, check whether the
 * computed value from `original` matches an EUI token. If so, replace
 * the baked hex with a `var(--dt-tokenName, hex)` reference so the
 * clone auto-adapts when the color mode changes.
 *
 * @param original - The original element to read computed styles from.
 * @param clone - The clone element to write token vars to.
 */
export const tagColorTokens = (original: HTMLElement, clone: HTMLElement): void => {
  const computed = getComputedStyle(original);

  for (const prop of COLOR_CSS_PROPS) {
    const value = computed.getPropertyValue(prop);
    const token = colorToToken(value, prop);
    if (token) {
      const hex = toHex(value);
      clone.style.setProperty(prop, getTokenVar(token, hex ?? undefined));
    }
  }
};

/**
 * Walk a DOM tree and update every `var(--dt-*)` inline style so its
 * fallback hex matches the current color mode.
 *
 * @param root - The root element to walk.
 */
export const resolveColorTokensDeep = (root: HTMLElement): void => {
  refreshTokenVars(root);
  for (const el of root.querySelectorAll<HTMLElement>('*')) {
    refreshTokenVars(el);
  }
  for (const style of root.querySelectorAll<HTMLStyleElement>('style')) {
    refreshPseudoStyleTag(style);
  }
};

const refreshTokenVars = (el: HTMLElement): void => {
  // First pass: strip any inline --dt-* custom property declarations
  // that may have been baked in by older exports. These must cascade
  // from the :root stylesheet, not be overridden per-element.
  const toRemove: string[] = [];
  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style[i];
    if (prop.startsWith(CSS_VAR_PREFIX)) {
      toRemove.push(prop);
    }
  }
  for (const prop of toRemove) {
    el.style.removeProperty(prop);
  }

  // Second pass: update var(--dt-*) fallback hex values to current mode.
  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style[i];
    const value = el.style.getPropertyValue(prop);
    const token = parseTokenVar(value);
    if (token) {
      el.style.setProperty(prop, getTokenVar(token, tokenToColor(token)));
    }
  }
};

const TOKEN_VAR_RE = /var\(--dt-([^,)]+)(?:,\s*[^)]+)?\)/g;

const refreshPseudoStyleTag = (style: HTMLStyleElement): void => {
  const text = style.textContent;
  if (!text || !text.includes(CSS_VAR_PREFIX)) return;
  style.textContent = text.replace(TOKEN_VAR_RE, (_match, name: string) =>
    getTokenVar(name, tokenToColor(name))
  );
};
