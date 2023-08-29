/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { EuiThemeProvider, EuiThemeProviderProps } from '@elastic/eui';

// @ts-ignore EUI exports this component internally, but Kibana isn't picking it up its types
import { useIsNestedEuiProvider } from '@elastic/eui/lib/components/provider/nested';
// @ts-ignore EUI exports this component internally, but Kibana isn't picking it up its types
import { emitEuiProviderWarning } from '@elastic/eui/lib/services/theme/warning';

import { KibanaEuiProvider } from '@kbn/react-kibana-context-root';

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
 *
 * TODO: Restore this to the main `KibanaThemeProvider` once all theme providers can be guaranteed
 * to have a parent `EuiProvider`
 */
const KibanaThemeProviderOnly = ({
  theme: { theme$ },
  euiTheme: theme,
  children,
  ...props
}: KibanaThemeProviderProps) => {
  const kibanaTheme = useObservable(theme$, defaultTheme);
  const colorMode = useMemo(() => getColorMode(kibanaTheme), [kibanaTheme]);

  return <EuiThemeProvider {...{ colorMode, theme, ...props }}>{children}</EuiThemeProvider>;
};

/**
 * Unfortunately, a lot of plugins are using `KibanaThemeProvider` without a parent
 * `EuiProvider` which provides very necessary setup (e.g. Emotion cache, breakpoints).
 *
 * If a render call is using the deprecated context, we need to render an EuiProvider first
 * (but without global styles, since those are already handled by `KibanaRootContextProvider`)
 *
 * TODO: clintandrewhall - We can remove this and revert to only exporting the above component
 * once all out-of-band renders are using `KibanaRenderContextProvider`.
 */
const KibanaThemeProviderCheck = ({ theme, children, ...props }: KibanaThemeProviderProps) => {
  const hasEuiProvider = useIsNestedEuiProvider();

  if (hasEuiProvider) {
    return (
      <KibanaThemeProviderOnly theme={theme} {...props}>
        {children}
      </KibanaThemeProviderOnly>
    );
  } else {
    emitEuiProviderWarning(
      'KibanaThemeProvider requires a parent KibanaRenderContextProvider.  Check your React tree and ensure that they are wrapped in a KibanaRenderContextProvider.'
    );
    return (
      <KibanaEuiProvider theme={theme} globalStyles={false}>
        {children}
      </KibanaEuiProvider>
    );
  }
};

/**
 * A Kibana-specific theme provider that uses the Kibana theme service to customize the EUI theme.
 *
 * If the theme provider is missing a parent EuiProvider, one will automatically be rendered instead.
 */
export const KibanaThemeProvider = KibanaThemeProviderCheck;
