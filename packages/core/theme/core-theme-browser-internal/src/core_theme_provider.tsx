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
import createCache from '@emotion/cache';
import { EuiProvider } from '@elastic/eui';
import { EUI_STYLES_GLOBAL } from '@kbn/core-base-common';
import type { CoreTheme } from '@kbn/core-theme-browser';
import { convertCoreTheme } from './convert_core_theme';

const defaultTheme: CoreTheme = {
  darkMode: false,
};

interface CoreThemeProviderProps {
  theme$: Observable<CoreTheme>;
  globalStyles?: boolean;
}

const globalCache = createCache({
  key: 'eui',
  container: document.querySelector(`meta[name="${EUI_STYLES_GLOBAL}"]`) as HTMLElement,
});
const emotionCache = createCache({
  key: 'css',
  container: document.querySelector(`meta[name="emotion"]`) as HTMLElement,
});
emotionCache.compat = true;

/**
 * Wrapper around `EuiProvider` converting (and exposing) core's theme to EUI theme.
 * @internal Only meant to be used within core for internal usages of EUI/React
 */
export const CoreThemeProvider: FC<CoreThemeProviderProps> = ({
  theme$,
  children,
  globalStyles,
}) => {
  const coreTheme = useObservable(theme$, defaultTheme);
  const euiTheme = useMemo(() => convertCoreTheme(coreTheme), [coreTheme]);
  const includeGlobalStyles = globalStyles === false ? false : undefined;
  return (
    <EuiProvider
      globalStyles={includeGlobalStyles}
      utilityClasses={includeGlobalStyles}
      colorMode={euiTheme.colorMode}
      theme={euiTheme.euiThemeSystem}
      cache={{ default: emotionCache, global: globalCache }}
    >
      {children}
    </EuiProvider>
  );
};
