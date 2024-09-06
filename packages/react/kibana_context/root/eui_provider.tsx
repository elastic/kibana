/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import createCache from '@emotion/cache';

import {
  EuiProvider,
  EuiProviderProps,
  euiStylisPrefixer,
  EuiThemeNewButtonOption1,
  EuiThemeNewButtonOption2_1,
  EuiThemeNewButtonOption2_2,
  EuiThemeNewButtonOption3,
  EuiThemeShape,
} from '@elastic/eui';

import { EUI_STYLES_GLOBAL, EUI_STYLES_UTILS } from '@kbn/core-base-common';
import { getColorMode, defaultTheme } from '@kbn/react-kibana-context-common';
import { ThemeServiceStart } from '@kbn/react-kibana-context-common';

const BUTTON_KEY_TO_THEME_MAP: Record<
  string,
  {
    model: EuiThemeShape;
    root: EuiThemeShape;
    key: string;
  }
> = {
  '1': EuiThemeNewButtonOption1,
  '2.1': EuiThemeNewButtonOption2_1,
  '2.2': EuiThemeNewButtonOption2_2,
  '3': EuiThemeNewButtonOption3,
};

/**
 * Props for the KibanaEuiProvider.
 */
export interface KibanaEuiProviderProps extends Pick<EuiProviderProps<{}>, 'modify' | 'colorMode'> {
  theme: ThemeServiceStart;
  globalStyles?: boolean;
}

// Set up the caches.
// https://eui.elastic.co/#/utilities/provider#cache-location
const stylisPlugins = [euiStylisPrefixer]; // https://emotion.sh/docs/@emotion/cache#stylisplugins

const emotionCache = createCache({
  key: 'css',
  stylisPlugins,
  container: document.querySelector('meta[name="emotion"]') as HTMLElement,
});

const globalCache = createCache({
  key: EUI_STYLES_GLOBAL,
  stylisPlugins,
  container: document.querySelector(`meta[name="${EUI_STYLES_GLOBAL}"]`) as HTMLElement,
});

const utilitiesCache = createCache({
  key: EUI_STYLES_UTILS,
  stylisPlugins,
  container: document.querySelector(`meta[name="${EUI_STYLES_UTILS}"]`) as HTMLElement,
});

// Enable "compat mode" in Emotion caches.
emotionCache.compat = true;
globalCache.compat = true;
utilitiesCache.compat = true;

const cache = { default: emotionCache, global: globalCache, utility: utilitiesCache };

/**
 * Prepares and returns a configured `EuiProvider` for use in Kibana roots.  In most cases, this utility context
 * should not be used.  Instead, refer to `KibanaRootContextProvider` to set up the root of Kibana.
 */
export const KibanaEuiProvider: FC<PropsWithChildren<KibanaEuiProviderProps>> = ({
  theme: { theme$ },
  globalStyles: globalStylesProp,
  colorMode: colorModeProp,
  modify,
  children,
}) => {
  const theme = useObservable(theme$, defaultTheme);
  const themeColorMode = useMemo(() => getColorMode(theme), [theme]);

  const selectedButtonOption = localStorage.getItem('kbn-theme-button-option');
  const selectedCustomTheme = selectedButtonOption
    ? BUTTON_KEY_TO_THEME_MAP[selectedButtonOption]
    : undefined;

  // In some cases-- like in Storybook or testing-- we want to explicitly override the
  // colorMode provided by the `theme`.
  const colorMode = colorModeProp || themeColorMode;

  // This logic was drawn from the Core theme provider, and wasn't present (or even used)
  // elsewhere.  Should be a passive addition to anyone using the older theme provider(s).
  const globalStyles = globalStylesProp === false ? false : undefined;

  const customThemeProps = selectedCustomTheme && { theme: selectedCustomTheme };

  return (
    <EuiProvider
      {...{
        cache,
        modify,
        colorMode,
        globalStyles,
        utilityClasses: globalStyles,
        ...customThemeProps,
      }}
    >
      {children}
    </EuiProvider>
  );
};
