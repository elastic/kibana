/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useMemo } from 'react';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { EuiThemeProvider } from '@elastic/eui';
import { CoreTheme } from './types';
import { convertCoreTheme } from './convert_core_theme';

const defaultTheme: CoreTheme = {
  darkMode: false,
};

interface CoreThemeProviderProps {
  theme$: Observable<CoreTheme>;
}

/**
 * Wrapper around `EuiThemeProvider` converting (and exposing) core's theme to EUI theme.
 * @internal Only meant to be used within core for internal usages of EUI/React
 */
export const CoreThemeProvider: FC<CoreThemeProviderProps> = ({ theme$, children }) => {
  const coreTheme = useObservable(theme$, defaultTheme);
  const euiTheme = useMemo(() => convertCoreTheme(coreTheme), [coreTheme]);
  return (
    <EuiThemeProvider colorMode={euiTheme.colorMode} theme={euiTheme.euiThemeSystem}>
      {children}
    </EuiThemeProvider>
  );
};
