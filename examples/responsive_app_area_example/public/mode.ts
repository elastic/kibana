/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBreakpointSize } from '@elastic/eui';

export type Mode = 'window' | 'css' | 'js';

// Read once at module load: EUI applies the mode before the first render, so switching needs a reload.
const MODE_FLAG = 'kbnSurfacePoc';
const stored = localStorage.getItem(MODE_FLAG);
export const mode: Mode = stored === 'css' || stored === 'js' ? stored : 'window';

export const cssFollowsAppArea = mode !== 'window';
export const jsFollowsAppArea = mode === 'js';

export const MODE_OPTIONS: Array<{ id: Mode; label: string }> = [
  { id: 'window', label: 'Window' },
  { id: 'css', label: 'CSS' },
  { id: 'js', label: 'CSS + JS' },
];

export const MODE_DESCRIPTIONS: Record<Mode, string> = {
  window: "Today's behavior. CSS and JS breakpoints follow the window.",
  css: 'CSS track. EUI styles follow the app area, JS breakpoints still follow the window.',
  js: 'CSS and JS tracks. Both follow the nearest breakpoint container.',
};

export const setMode = (id: string) => {
  if (id === 'window') {
    localStorage.removeItem(MODE_FLAG);
  } else {
    localStorage.setItem(MODE_FLAG, id);
  }
  window.location.reload();
};

export const BREAKPOINTS: EuiBreakpointSize[] = ['xs', 's', 'm', 'l', 'xl'];

export const isBelow = (current: EuiBreakpointSize | undefined, size: EuiBreakpointSize) =>
  current !== undefined && BREAKPOINTS.indexOf(current) < BREAKPOINTS.indexOf(size);
