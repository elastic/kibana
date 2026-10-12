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
import React, { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import useObservable from 'react-use/lib/useObservable';
import createCache from '@emotion/cache';

// We can't use the import directly because the package isn't included in the shared bundle, so below the value is hardcoded.
// However, we import this directly in the test to ensure our hardcoded selector is correct.
// import { euiIncludeSelectorInFocusTrap } from '@kbn/core-chrome-layout-constants';

import type { EuiProviderProps } from '@elastic/eui';
import { EUI_BREAKPOINT_CONTAINER_ATTRIBUTE, EuiProvider, euiStylisPrefixer } from '@elastic/eui';
import { EUI_STYLES_GLOBAL, EUI_STYLES_UTILS } from '@kbn/core-base-common';
import {
  getColorMode,
  defaultTheme,
  getThemeConfigByName,
  DEFAULT_THEME_CONFIG,
} from '@kbn/react-kibana-context-common';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';

/**
 * Props for the KibanaEuiProvider.
 */
export interface KibanaEuiProviderProps extends Pick<EuiProviderProps<{}>, 'modify' | 'colorMode'> {
  theme: ThemeServiceStart;
  userProfile?: Pick<UserProfileService, 'getUserProfile$'>;
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

// Flyouts are scoped to the app area wrapper, which is also the breakpoint container. Push padding
// then shrinks the container's content box, so breakpoints follow the area left next to a push flyout.
const FLYOUT_CONTAINER_SELECTOR = `[${EUI_BREAKPOINT_CONTAINER_ATTRIBUTE}]`;

// `localStorage.kbnSurfacePocDebug = 'true'` outlines each root's mount element:
// red inside the app area, purple outside it. Reload after changing.
const BREAKPOINT_DEBUG = localStorage.getItem('kbnSurfacePocDebug') === 'true';
const DEBUG_ATTRIBUTE = 'data-kbn-breakpoint-debug';
const DEBUG_STYLES = `
  [${DEBUG_ATTRIBUTE}] { outline: 2px solid purple; outline-offset: -2px; }
  [${EUI_BREAKPOINT_CONTAINER_ATTRIBUTE}] [${DEBUG_ATTRIBUTE}] { outline-color: red; }
`;

const markForDebug = (element: HTMLElement) => {
  element.setAttribute(DEBUG_ATTRIBUTE, '');
  if (document.getElementById('kbn-breakpoint-debug')) return;
  const style = document.createElement('style');
  style.id = 'kbn-breakpoint-debug';
  style.textContent = DEBUG_STYLES;
  document.head.appendChild(style);
};

/**
 * Finds the element this provider renders into from a hidden marker, so roots don't have to pass it.
 * The marker renders alone in the first commit and is replaced by the children before paint,
 * so it never shows up next to them in the DOM.
 */
const useMarkerMountElement = () => {
  const markerRef = useRef<HTMLSpanElement>(null);
  const [mountElement, setMountElement] = useState<HTMLElement>();

  useLayoutEffect(() => {
    const parent = markerRef.current?.parentElement;
    if (parent && BREAKPOINT_DEBUG) markForDebug(parent);
    if (parent?.isConnected) {
      setMountElement(parent);
      return;
    }
    // A root rendered into an element that isn't in the page yet (or without a DOM, like
    // react-test-renderer) can't find its container, so it falls back to `body`.
    parent?.setAttribute('data-kbn-breakpoint-detached', '');
    setMountElement(document.body);
  }, []);

  return { markerRef, mountElement };
};

// `renderToStaticMarkup` (used for a few string-rendered tooltips) runs no layout effects, so the marker would
// never be replaced. Its server snapshot tells us to render the children right away.
const noopSubscribe = () => () => {};
const useIsStaticRender = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => false,
    () => true
  );

const componentDefaults: EuiProviderProps<unknown>['componentDefaults'] = {
  EuiFlyout: {
    includeSelectorInFocusTrap: `[data-eui-includes-in-flyout-focus-trap="true"]`,
    container: FLYOUT_CONTAINER_SELECTOR,
  },
  EuiPopover: {
    repositionOnScroll: true,
  },
  EuiToolTip: {
    repositionOnScroll: true,
  },
  EuiTable: {
    scrollableInline: true,
    tableLayout: 'auto',
    responsiveBreakpoint: false,
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
  children,
}) => {
  const { theme$ } = theme;
  const { markerRef, mountElement } = useMarkerMountElement();
  const isStaticRender = useIsStaticRender();

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
  const userSettings = userProfileData?.userSettings;
  let highContrastMode: boolean | undefined;
  if (userSettings?.contrastMode && userSettings?.contrastMode !== 'system') {
    highContrastMode = userSettings.contrastMode === 'high';
  }

  // This logic was drawn from the Core theme provider, and wasn't present (or even used)
  // elsewhere.  Should be a passive addition to anyone using the older theme provider(s).
  const globalStyles = globalStylesProp === false ? false : undefined;

  if (!mountElement && !isStaticRender) return <span hidden ref={markerRef} />;

  return (
    <EuiProvider
      {...{
        cache,
        modify,
        colorMode,
        globalStyles,
        utilityClasses: globalStyles,
        highContrastMode,
        theme: _theme,
        componentDefaults,
        // EUI CSS and JS breakpoints follow the nearest breakpoint container (the app area or `body`).
        breakpointContainer: mountElement ? { mountElement } : true,
      }}
    >
      {children}
    </EuiProvider>
  );
};
