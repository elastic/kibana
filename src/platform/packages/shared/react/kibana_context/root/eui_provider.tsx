/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import type { FC, PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import createCache from '@emotion/cache';

// We can't use the import directly because the package isn't included in the shared bundle, so below the value is hardcoded.
// However, we import this directly in the test to ensure our hardcoded selector is correct.
// import { euiIncludeSelectorInFocusTrap } from '@kbn/core-chrome-layout-constants';

import type { EuiProviderProps } from '@elastic/eui';
import { EuiProvider, euiStylisPrefixer } from '@elastic/eui';
import { EUI_STYLES_GLOBAL, EUI_STYLES_UTILS } from '@kbn/core-base-common';
import type { EmotionCache } from '@emotion/cache';
import {
  getColorMode,
  defaultTheme,
  getThemeConfigByName,
  DEFAULT_THEME_CONFIG,
} from '@kbn/react-kibana-context-common';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';

/**
 * Shape of the Emotion cache object passed to EuiProvider when using custom caches
 * (e.g. per-flyout caches). Must include default, global, and utility caches.
 */
export interface KibanaEmotionCacheObject {
  default: EmotionCache;
  global: EmotionCache;
  utility: EmotionCache;
}

interface UserSettings {
  contrastMode: 'system' | 'standard' | 'high';
}

/**
 * Props for the KibanaEuiProvider.
 */
export interface KibanaEuiProviderProps extends Pick<EuiProviderProps<{}>, 'modify' | 'colorMode'> {
  theme: ThemeServiceStart;
  userProfile?: Pick<UserProfileService, 'getUserProfile$'>;
  globalStyles?: boolean;
  /**
   * Optional Emotion cache object. When provided (e.g. for a flyout), this cache is used
   * instead of the shared module-level cache. The caller is responsible for flushing
   * the cache before removing the container from the DOM.
   */
  cache?: KibanaEmotionCacheObject;
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
 * Creates a set of Emotion caches targeting the given container (e.g. a flyout DOM node)
 * and a flush callback. Use this for isolated render trees so that styles are injected
 * into the container and can be flushed before the container is removed.
 *
 * @param container - DOM element that will host the style tags
 * @param keyPrefix - Unique prefix for cache keys (e.g. `flyout-${id}-`). Invalid characters
 *   for CSS class names / data-emotion attributes (e.g. whitespace, punctuation) are replaced with hyphens.
 * @returns Object with `cache` (for EuiProvider) and `flush()` to call before removing the container
 */
export const createEmotionCacheForContainer = (
  container: HTMLElement,
  keyPrefix: string
): { cache: KibanaEmotionCacheObject; flush: () => void } => {
  // Sanitize for use in CSS class names and data-emotion attributes (allow only [a-zA-Z0-9_-])
  const safePrefix = keyPrefix.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'kbn';

  const defaultCache = createCache({
    ...sharedCacheOptions,
    key: `${safePrefix}-css`,
    container,
  });
  const globalCacheForContainer = createCache({
    ...sharedCacheOptions,
    key: `${safePrefix}-${EUI_STYLES_GLOBAL}`,
    container,
  });
  const utilityCacheForContainer = createCache({
    ...sharedCacheOptions,
    key: `${safePrefix}-${EUI_STYLES_UTILS}`,
    container,
  });
  defaultCache.compat = true;
  globalCacheForContainer.compat = true;
  utilityCacheForContainer.compat = true;

  const flyoutCache: KibanaEmotionCacheObject = {
    default: defaultCache,
    global: globalCacheForContainer,
    utility: utilityCacheForContainer,
  };

  const flush = () => {
    flyoutCache.default.sheet.flush();
    flyoutCache.global.sheet.flush();
    flyoutCache.utility.sheet.flush();
  };

  return { cache: flyoutCache, flush };
};

const componentDefaults: EuiProviderProps<unknown>['componentDefaults'] = {
  EuiFlyout: {
    includeSelectorInFocusTrap: `[data-eui-includes-in-flyout-focus-trap="true"]`,
  },
  EuiPopover: {
    repositionOnScroll: true,
  },
  EuiToolTip: {
    repositionOnScroll: true,
  },
};

/**
 * Prepares and returns a configured `EuiProvider` for use in Kibana roots.  In most cases, this utility context
 * should not be used.  Instead, refer to `KibanaRootContextProvider` to set up the root of Kibana.
 */
export const KibanaEuiProvider: FC<PropsWithChildren<KibanaEuiProviderProps>> = ({
  theme,
  userProfile,
  globalStyles: globalStylesProp,
  colorMode: colorModeProp,
  modify,
  cache: cacheProp,
  children,
}) => {
  const { theme$ } = theme;
  const resolvedCache = cacheProp ?? cache;

  // use the selected theme if available before using the defaultTheme; this ensures that
  // Kibana loads with the currently selected theme without additional updates from default to selected
  const initialTheme = theme.getTheme?.() ?? defaultTheme;

  const kibanaTheme = useObservable(theme$, initialTheme);
  const themeColorMode = useMemo(() => getColorMode(kibanaTheme), [kibanaTheme]);

  const _theme = useMemo(() => {
    const config = getThemeConfigByName(kibanaTheme.name) || DEFAULT_THEME_CONFIG;
    return config.euiTheme;
  }, [kibanaTheme.name]);

  // In some cases-- like in Storybook or testing-- we want to explicitly override the
  // colorMode provided by the `theme`.
  const colorMode = colorModeProp || themeColorMode;

  const getUserProfile$ = useMemo(
    () => userProfile?.getUserProfile$ ?? Rx.of,
    [userProfile?.getUserProfile$]
  );
  const userProfileData = useObservable(getUserProfile$(), null);

  // If the high contrast mode value is undefined, EUI will use the OS level setting.
  const userSettings = userProfileData?.userSettings as UserSettings | undefined;
  let highContrastMode: boolean | undefined;
  if (userSettings?.contrastMode && userSettings?.contrastMode !== 'system') {
    highContrastMode = userSettings.contrastMode === 'high';
  }

  // This logic was drawn from the Core theme provider, and wasn't present (or even used)
  // elsewhere.  Should be a passive addition to anyone using the older theme provider(s).
  const globalStyles = globalStylesProp === false ? false : undefined;

  return (
    <EuiProvider
      {...{
        cache: resolvedCache,
        modify,
        colorMode,
        globalStyles,
        utilityClasses: globalStyles,
        highContrastMode,
        theme: _theme,
        componentDefaults,
      }}
    >
      {children}
    </EuiProvider>
  );
};
