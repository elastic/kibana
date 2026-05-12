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
export const DASHBOARD_DEFAULT_BACKGROUND_TOKEN = 'backgroundBaseSubdued';

export type DashboardBackgroundBaseToken = string;

export interface DashboardBackgroundListOption {
  readonly text: string;
  readonly value: string;
}

/**
 * EUI semantic `backgroundBase*` tokens (see
 * https://eui.elastic.co/docs/getting-started/theming/tokens/colors/#background-colors).
 * Built from the active theme so new tokens are picked up automatically.
 */
export function getDashboardBackgroundBaseTokenOptions(
  colors: UseEuiTheme['euiTheme']['colors']
): DashboardBackgroundListOption[] {
  const record = colors as Record<string, unknown>;
  return (Object.keys(record) as string[])
    .filter((key) => key.startsWith('backgroundBase') && typeof record[key] === 'string')
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      text: value
        .replace(/^backgroundBase/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim(),
      value,
    }));
}

export function resolveDashboardBackgroundBaseColor(
  colors: UseEuiTheme['euiTheme']['colors'],
  token: DashboardBackgroundBaseToken
): string {
  const record = colors as Record<string, unknown>;
  const resolved = record[token];
  if (typeof resolved === 'string') {
    return resolved;
  }
  const fallback = record[DASHBOARD_DEFAULT_BACKGROUND_TOKEN];
  return typeof fallback === 'string' ? fallback : '#fff';
}
