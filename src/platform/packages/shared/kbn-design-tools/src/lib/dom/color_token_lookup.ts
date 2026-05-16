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

type TokenCategory = 'text' | 'background' | 'other';

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
  return 'other';
};

export const isTextToken = (name: string): boolean => classifyToken(name) === 'text';
export const isBgToken = (name: string): boolean => classifyToken(name) === 'background';

/**
 * Normalise any CSS color string to a lowercase hex value.
 * Returns `null` for non-color values or fully-transparent values.
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
  'background-color',
]);

interface TokenLookup {
  readonly forward: ReadonlyMap<string, string>;
  readonly textReverse: ReadonlyMap<string, string>;
  readonly bgReverse: ReadonlyMap<string, string>;
  readonly fallbackReverse: ReadonlyMap<string, string>;
}

const buildLookup = (): TokenLookup => {
  const mode = getPageColorMode();
  const themeColors = EuiThemeBorealis.root.colors as unknown as Record<string, unknown>;
  const palette = (mode === 'dark' ? themeColors.DARK : themeColors.LIGHT) as Record<
    string,
    unknown
  >;

  const forward = new Map<string, string>();
  const textReverse = new Map<string, string>();
  const bgReverse = new Map<string, string>();
  const fallbackReverse = new Map<string, string>();

  for (const [key, value] of Object.entries(palette)) {
    if (typeof value !== 'string') continue;
    const hex = toHex(value);
    if (!hex) continue;
    forward.set(key, hex);

    const category = classifyToken(key);
    if (category === 'text' && !textReverse.has(hex)) textReverse.set(hex, key);
    else if (category === 'background' && !bgReverse.has(hex)) bgReverse.set(hex, key);
    if (!fallbackReverse.has(hex)) fallbackReverse.set(hex, key);
  }

  syncTokenStylesheet();
  return { forward, textReverse, bgReverse, fallbackReverse };
};

/** Lazily-initialised, rebuilt on each `initColorTokenLookup()` call. */
let cache: TokenLookup | null = null;

const getLookup = (): TokenLookup => {
  if (!cache) cache = buildLookup();
  return cache;
};

/**
 * Rebuild the hex↔token lookup for the current color mode.
 * Call when the page color mode changes.
 */
export const initColorTokenLookup = (): void => {
  cache = buildLookup();
};

const colorToToken = (cssValue: string, cssProp: string): string | undefined => {
  const { textReverse, bgReverse, fallbackReverse } = getLookup();
  const hex = toHex(cssValue);
  if (!hex) return undefined;

  if (cssProp === 'background-color') {
    const bgToken = bgReverse.get(hex);
    if (bgToken) return bgToken;
    const fb = fallbackReverse.get(hex);
    return fb && !BG_DENY_TOKENS.has(fb) ? fb : undefined;
  }
  if (cssProp === 'color' || cssProp === '-webkit-text-fill-color') {
    return textReverse.get(hex) ?? fallbackReverse.get(hex);
  }
  return fallbackReverse.get(hex);
};

const tokenToColor = (token: string): string | undefined => getLookup().forward.get(token);

/**
 * For each color-bearing CSS property on `clone`, check whether the
 * computed value from `original` matches an EUI token. If so, replace
 * the baked hex with a `var(--dt-tokenName, hex)` reference so the
 * clone auto-adapts when the color mode changes.
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
 */
export const resolveColorTokensDeep = (root: HTMLElement): void => {
  refreshTokenVars(root);
  for (const el of root.querySelectorAll<HTMLElement>('*')) {
    refreshTokenVars(el);
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
