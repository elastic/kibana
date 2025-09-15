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

import { EuiProvider, EuiProviderProps, euiStylisPrefixer, EuiThemeAmsterdam } from '@elastic/eui';
import { EUI_STYLES_GLOBAL, EUI_STYLES_UTILS } from '@kbn/core-base-common';
import { getColorMode, defaultTheme } from '@kbn/react-kibana-context-common';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { ThemeServiceStart } from '@kbn/react-kibana-context-common';

/**
 * Props for the KibanaEuiProvider.
 */
export interface KibanaEuiProviderProps extends Pick<EuiProviderProps<{}>, 'modify' | 'colorMode'> {
  theme: ThemeServiceStart;
  userProfile?: Pick<UserProfileService, 'getUserProfile$'>; // TODO: use this to access a "high contrast mode" flag from user settings. Pass the flag to EuiProvider, when it is supported in EUI.
  globalStyles?: boolean;
}

const sharedCacheOptions = {
  // Set up the caches.
  // https://eui.elastic.co/docs/utilities/provider/#emotioncache-customization
  stylisPlugins: [euiStylisPrefixer], // https://emotion.sh/docs/@emotion/cache#stylisplugins

  // Enables Emotion's speedy mode in dev (same as prod).
  // This uses `insertRule` instead of default injecting <style> tags for better performance (~10x faster).
  // Historically disabled in dev for easier inspection, but it's no longer the issue: modern dev tools support editing styles.
  // docs: https://github.com/emotion-js/emotion/blob/main/packages/sheet/README.md#speedy
  speedy: true, // Enable speedy mode for better performance
};

const emotionCache = createCache({
  ...sharedCacheOptions,
  key: 'css',
  container: document.querySelector('meta[name="emotion"]') as HTMLElement,
});

const globalCache = createCache({
  ...sharedCacheOptions,
  key: EUI_STYLES_GLOBAL,
  container: document.querySelector(`meta[name="${EUI_STYLES_GLOBAL}"]`) as HTMLElement,
});

const utilitiesCache = createCache({
  ...sharedCacheOptions,
  key: EUI_STYLES_UTILS,
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

  // In some cases-- like in Storybook or testing-- we want to explicitly override the
  // colorMode provided by the `theme`.
  const colorMode = colorModeProp || themeColorMode;

  // This logic was drawn from the Core theme provider, and wasn't present (or even used)
  // elsewhere.  Should be a passive addition to anyone using the older theme provider(s).
  const globalStyles = globalStylesProp === false ? false : undefined;

  return (
    <EuiProvider
      {...{
        cache,
        modify,
        colorMode,
        globalStyles,
        utilityClasses: globalStyles,
        theme: EuiThemeAmsterdam,
        highContrastMode: false,
      }}
    >
      {children}
    </EuiProvider>
  );
};
