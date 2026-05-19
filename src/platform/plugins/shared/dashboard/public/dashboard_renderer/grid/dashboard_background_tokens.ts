/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';

/** Matches dashboard canvas default before Tweakpane (`dashboardViewportStyles.wrapper`). */
export const DASHBOARD_DEFAULT_BACKGROUND_TOKEN = 'backgroundBasePlain';

/** Default embeddable panel surface before Tweakpane overrides. */
export const DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN = 'backgroundBasePlain';

export type DashboardBackgroundBaseToken = string;
export type DashboardBackgroundToken = string;

export interface DashboardBackgroundListOption {
  readonly text: string;
  readonly value: string;
  /** Resolved CSS color in the active theme (for Tweakpane list swatches). */
  readonly color: string;
}

/**
 * EUI semantic `backgroundBase*` tokens (see
 * https://eui.elastic.co/docs/getting-started/theming/tokens/colors/#background-colors).
 * Built from the active theme so new tokens are picked up automatically.
 */
function formatBackgroundTokenLabel(value: string): string {
  return value
    .replace(/^background/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

/**
 * All EUI semantic `background*` color tokens on the active theme (base, light, accent, etc.).
 */
export function getDashboardBackgroundTokenOptions(
  colors: UseEuiTheme['euiTheme']['colors']
): DashboardBackgroundListOption[] {
  const record = colors as Record<string, unknown>;
  return (Object.keys(record) as string[])
    .filter((key) => key.startsWith('background') && typeof record[key] === 'string')
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      text: formatBackgroundTokenLabel(value),
      value,
      color: record[value] as string,
    }));
}

/** @deprecated Use {@link getDashboardBackgroundTokenOptions} — kept for dashboard canvas control. */
export function getDashboardBackgroundBaseTokenOptions(
  colors: UseEuiTheme['euiTheme']['colors']
): DashboardBackgroundListOption[] {
  const record = colors as Record<string, unknown>;
  return (Object.keys(record) as string[])
    .filter((key) => key.startsWith('backgroundBase') && typeof record[key] === 'string')
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      text: formatBackgroundTokenLabel(value),
      value,
      color: record[value] as string,
    }));
}

export function getPanelBackgroundTokenForColorMode(
  layoutTweak: {
    lightModePanelBackgroundToken: DashboardBackgroundToken;
    darkModePanelBackgroundToken: DashboardBackgroundToken;
  },
  colorMode: string
): DashboardBackgroundToken {
  return colorMode === 'DARK'
    ? layoutTweak.darkModePanelBackgroundToken
    : layoutTweak.lightModePanelBackgroundToken;
}

export function resolveDashboardBackgroundColor(
  colors: UseEuiTheme['euiTheme']['colors'],
  token: DashboardBackgroundToken
): string {
  const record = colors as Record<string, unknown>;
  const resolved = record[token];
  if (typeof resolved === 'string') {
    return resolved;
  }
  const fallback = record[DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN];
  return typeof fallback === 'string' ? fallback : '#fff';
}

/** @deprecated Use {@link resolveDashboardBackgroundColor}. */
export function resolveDashboardBackgroundBaseColor(
  colors: UseEuiTheme['euiTheme']['colors'],
  token: DashboardBackgroundBaseToken
): string {
  return resolveDashboardBackgroundColor(colors, token);
}
