/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiProviderProps } from '@elastic/eui';
import React, { type FC } from 'react';
import type { Observable } from 'rxjs';

import type { CoreTheme } from '@kbn/core-theme-browser';
import { KibanaThemeProvider as KbnThemeProvider } from '@kbn/react-kibana-context-theme';

export interface KibanaThemeProviderProps {
  theme$: Observable<CoreTheme>;
  modify?: EuiProviderProps<{}>['modify'];
}

/** @deprecated use `KibanaThemeProvider` from `@kbn/react-kibana-context-theme */
export const KibanaThemeProvider: FC<KibanaThemeProviderProps> = ({ theme$, modify, children }) => (
  <KbnThemeProvider {...{ theme: { theme$ }, modify }}>{children}</KbnThemeProvider>
);
