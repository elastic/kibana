/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  KibanaThemeProvider as KbnThemeProvider,
  KibanaThemeProviderProps as KbnThemeProviderProps,
  wrapWithTheme as kbnWrapWithTheme,
} from '@kbn/react-kibana-context-theme';

/** @deprecated Use `KibanaThemeProviderProps` from `@kbn/react-kibana-context-theme`  */
export type KibanaThemeProviderProps = Pick<KbnThemeProviderProps, 'children' | 'modify'> &
  KbnThemeProviderProps['theme'];

/** @deprecated Use `KibanaThemeProvider` from `@kbn/react-kibana-context-theme`  */
export const KibanaThemeProvider = ({ children, theme$, modify }: KibanaThemeProviderProps) => (
  <KbnThemeProvider theme={{ theme$ }} {...modify}>
    {children}
  </KbnThemeProvider>
);

type Theme = KbnThemeProviderProps['theme']['theme$'];

export const wrapWithTheme = (node: React.ReactNode, theme$: Theme) =>
  kbnWrapWithTheme(node, { theme$ });
