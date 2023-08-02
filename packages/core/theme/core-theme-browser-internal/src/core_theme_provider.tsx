/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type FC } from 'react';
import { CoreTheme } from '@kbn/core-theme-browser/src/types';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { Observable } from 'rxjs';

interface CoreThemeProviderProps {
  theme$: Observable<CoreTheme>;
  globalStyles?: boolean;
}

/**
 * Wrapper around `EuiProvider` converting (and exposing) core's theme to EUI theme.
 * @internal Only meant to be used within core for internal usages of EUI/React
 * @deprecated use `KibanaThemeProvider` from `@kbn/react-kibana-context-theme
 */
export const CoreThemeProvider: FC<CoreThemeProviderProps> = ({
  theme$,
  globalStyles,
  children,
}) => (
  <KibanaThemeProvider {...{ theme: { theme$ }, globalStyles }}>{children}</KibanaThemeProvider>
);
