/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Observable } from 'rxjs';

import { EuiProviderProps } from '@elastic/eui';
import { CoreTheme } from '@kbn/core-theme-browser';
import { KibanaThemeProvider as KbnThemeProvider } from '@kbn/react-kibana-context-theme';

export interface KibanaThemeProviderProps {
  theme$: Observable<CoreTheme>;
  modify?: EuiProviderProps<{}>['modify'];
  children: React.ReactNode;
}

/** @deprecated use `KibanaThemeProvider` from `@kbn/react-kibana-context-theme */
export const KibanaThemeProvider = ({ theme$, modify, children }: KibanaThemeProviderProps) => (
  <KbnThemeProvider {...{ theme: { theme$ }, modify }}>{children}</KbnThemeProvider>
);
