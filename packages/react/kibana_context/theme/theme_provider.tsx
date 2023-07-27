/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';

import {
  CurrentEuiBreakpointProvider,
  EuiThemeProvider,
  EuiThemeProviderProps,
} from '@elastic/eui';

import {
  getColorMode,
  defaultTheme,
  type ThemeServiceStart,
} from '@kbn/react-kibana-context-common';

// Extract the `theme` from `EuiThemeProviderProps` as a type.
type EuiTheme<T = {}> = EuiThemeProviderProps<T>['theme'];

// Omit the `theme` and `colorMode` props from `EuiThemeProviderProps` so we can
// add our own `euiTheme` prop and derive `colorMode` from the Kibana theme.
interface EuiProps<T = {}> extends Omit<EuiThemeProviderProps<T>, 'theme' | 'colorMode'> {
  euiTheme?: EuiTheme<T>;
}

/**
 * Props for the `KibanaThemeProvider`.
 */
export interface KibanaThemeProviderProps extends EuiProps {
  /** The `ThemeServiceStart` API. */
  theme: ThemeServiceStart;
}

/**
 * A Kibana-specific theme provider that uses the Kibana theme service to customize the EUI theme.
 */
export const KibanaThemeProvider = ({
  theme: { theme$ },
  euiTheme: theme,
  children,
  ...props
}: KibanaThemeProviderProps) => {
  const kibanaTheme = useObservable(theme$, defaultTheme);
  const colorMode = useMemo(() => getColorMode(kibanaTheme), [kibanaTheme]);

  // We have to add a breakpoint provider, because the `EuiProvider` we were using-- instead
  // of `EuiThemeProvider`-- adds a breakpoint.  Without it here now, several Kibana layouts
  // break, particularly sidebars.
  //
  // We can investigate removing it later, but I'm adding it here for now.
  return (
    <EuiThemeProvider {...{ colorMode, theme, ...props }}>
      <CurrentEuiBreakpointProvider>{children}</CurrentEuiBreakpointProvider>
    </EuiThemeProvider>
  );
};
