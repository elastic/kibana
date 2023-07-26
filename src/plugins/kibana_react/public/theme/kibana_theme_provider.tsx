/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { EuiProvider, EuiProviderProps } from '@elastic/eui';
import createCache from '@emotion/cache';
import { EUI_STYLES_GLOBAL, EUI_STYLES_UTILS } from '@kbn/core-base-common';
import type { CoreTheme } from '@kbn/core/public';
import { getColorMode } from './utils';

interface KibanaThemeProviderProps {
  theme$: Observable<CoreTheme>;
  modify?: EuiProviderProps<{}>['modify'];
}

const defaultTheme: CoreTheme = {
  darkMode: false,
};

const globalCache = createCache({
  key: EUI_STYLES_GLOBAL,
  container: document.querySelector(`meta[name="${EUI_STYLES_GLOBAL}"]`) as HTMLElement,
});
globalCache.compat = true;
const utilitiesCache = createCache({
  key: EUI_STYLES_UTILS,
  container: document.querySelector(`meta[name="${EUI_STYLES_UTILS}"]`) as HTMLElement,
});
utilitiesCache.compat = true;
const emotionCache = createCache({
  key: 'css',
  container: document.querySelector('meta[name="emotion"]') as HTMLElement,
});
emotionCache.compat = true;

/* IMPORTANT: This code has been copied to the `interactive_setup` plugin, any changes here should be applied there too.
That copy and this comment can be removed once https://github.com/elastic/kibana/issues/119204 is implemented.*/
// IMPORTANT: This code has been copied to the `kibana_utils` plugin, to avoid cyclical dependency, any changes here should be applied there too.

export const KibanaThemeProvider: FC<KibanaThemeProviderProps> = ({ theme$, modify, children }) => {
  const theme = useObservable(theme$, defaultTheme);
  const colorMode = useMemo(() => getColorMode(theme), [theme]);
  return (
    <EuiProvider
      colorMode={colorMode}
      cache={{ default: emotionCache, global: globalCache, utility: utilitiesCache }}
      globalStyles={false}
      utilityClasses={false}
      modify={modify}
    >
      {children}
    </EuiProvider>
  );
};
