/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Returns the page's actual color mode ('light' or 'dark') by reading
 * `window.__kbnThemeTag__`. The design tools toolbar is always rendered in
 * dark mode via its own `EuiThemeProvider`, so `useEuiTheme().colorMode`
 * cannot be trusted for page-level color matching.
 */
export const usePageColorMode = (): 'light' | 'dark' => {
  const tag = (window as any)?.__kbnThemeTag__ as string | undefined;
  return tag?.endsWith('dark') ? 'dark' : 'light';
};
