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
import createCache from '@emotion/cache';

import { EuiProvider, EuiProviderProps } from '@elastic/eui';

import { getColorMode } from './color_mode';
import type { Theme } from '../types';

export interface KibanaThemeProviderProps
  extends Pick<EuiProviderProps<{}>, 'modify' | 'colorMode'> {
  theme$: Observable<Theme>;
  globalStyles?: boolean;
  utilityClasses?: boolean;
}

const defaultTheme: Theme = {
  darkMode: false,
};

const globalCache = createCache({
  key: 'eui',
  container: document.querySelector(`meta[name="eui-global"]`) as HTMLElement,
});

const emotionCache = createCache({
  key: 'css',
  container: document.querySelector(`meta[name="emotion"]`) as HTMLElement,
});

emotionCache.compat = true;

const cache = { default: emotionCache, global: globalCache };

export const KibanaThemeProvider: FC<KibanaThemeProviderProps> = ({
  theme$,
  globalStyles: globalStylesProp,
  utilityClasses: utilityClassesProp,
  colorMode: colorModeProp,
  modify,
  children,
}) => {
  const theme = useObservable(theme$, defaultTheme);
  const themeColorMode = useMemo(() => getColorMode(theme), [theme]);

  // In some cases-- like in Storybook or testing-- we want to explicitly override the
  // colorMode provided by the `theme`.
  const colorMode = colorModeProp || themeColorMode;

  // This logic was drawn from the Core theme provider, and wasn't present (or even used)
  // elsewhere.  Should be a passive addition to anyone using the older theme provider(s).
  const globalStyles = globalStylesProp === false ? false : undefined;
  const utilityClasses =
    utilityClassesProp === false || globalStylesProp === false ? false : undefined;

  return (
    <EuiProvider {...{ cache, colorMode, globalStyles, modify, utilityClasses }}>
      {children}
    </EuiProvider>
  );
};
