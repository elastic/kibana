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
import {
  EUI_STYLES_GLOBAL,
  EUI_STYLES_UTILS,
  KBN_EMOTION_CONTAINER_GLOBAL_ID,
  KBN_EMOTION_CONTAINER_CSS_ID,
  KBN_EMOTION_CONTAINER_UTILS_ID,
} from '@kbn/core-base-common';
import {
  getColorMode,
  defaultTheme,
  getThemeConfigByName,
  DEFAULT_THEME_CONFIG,
} from '@kbn/react-kibana-context-common';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';

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

const EMOTION_DEBUG_PREFIX = '[Kibana Emotion]';

/**
 * Resolves the Emotion cache container: prefers stable div by id (new template), falls back to meta (legacy).
 * Stable containers avoid insertBefore crashes when multiple flyouts unmount and the sheet holds stale tag refs.
 * Returns undefined when run outside the browser (e.g. SSR).
 */
function getEmotionContainer(containerId: string, metaNameFallback: string): HTMLElement | undefined {
  if (typeof document === 'undefined') {
    console.debug(EMOTION_DEBUG_PREFIX, 'getEmotionContainer: no document (SSR)', { containerId, metaNameFallback });
    return undefined;
  }
  const byId = document.getElementById(containerId);
  if (byId) {
    console.debug(EMOTION_DEBUG_PREFIX, 'getEmotionContainer: using stable div by id', { containerId, metaNameFallback });
    return byId;
  }
  const byMeta = document.querySelector<HTMLElement>(`meta[name="${metaNameFallback}"]`);
  if (byMeta) {
    console.debug(EMOTION_DEBUG_PREFIX, 'getEmotionContainer: fallback to meta', { containerId, metaNameFallback });
    return byMeta;
  }
  console.debug(EMOTION_DEBUG_PREFIX, 'getEmotionContainer: fallback to document.head', { containerId, metaNameFallback });
  return document.head;
}

/**
 * Wraps an Emotion cache's sheet._insertTag to validate the insertion point before insertBefore.
 * When multiple flyouts close (e.g. closeAllFlyouts), the sheet can hold references to style tags
 * that were removed from the DOM; the next insert then throws "The node before which the new node
 * is to be inserted is not a child of this node." We fall back to appending and clear stale tag refs.
 */
function wrapSheetInsertTag(
  sheetKey: string,
  sheet: {
    container: Node;
    tags: HTMLStyleElement[];
    insertionPoint?: HTMLElement;
    prepend?: boolean;
    before?: Node | null;
    _insertTag: (tag: HTMLStyleElement) => void;
  }
): void {
  sheet._insertTag = (tag: HTMLStyleElement) => {
    const container = sheet.container;
    let before: Node | null;
    if (sheet.tags.length === 0) {
      before = sheet.insertionPoint
        ? sheet.insertionPoint.nextSibling
        : sheet.prepend
          ? container.firstChild
          : sheet.before ?? null;
    } else {
      before = sheet.tags[sheet.tags.length - 1].nextSibling;
    }
    const validBefore = before === null || before.parentNode === container;
    if (!validBefore) {
      const prevCount = sheet.tags.length;
      sheet.tags = sheet.tags.filter((t) => t.parentNode === container);
      const afterCount = sheet.tags.length;
      console.debug(EMOTION_DEBUG_PREFIX, 'insertTag: invalid before, cleared stale tags', {
        sheetKey,
        prevTagCount: prevCount,
        afterTagCount: afterCount,
        beforeParentNode: before?.parentNode?.nodeName,
        containerNodeName: container.nodeName,
      });
      before = sheet.tags.length > 0 ? sheet.tags[sheet.tags.length - 1].nextSibling : null;
    }
    (container as HTMLElement).insertBefore(tag, before);
    sheet.tags.push(tag);
  };
  console.debug(EMOTION_DEBUG_PREFIX, 'wrapSheetInsertTag: wrapped sheet', { sheetKey });
}

const emotionCache = createCache({
  ...sharedCacheOptions,
  key: 'css',
  container: getEmotionContainer(KBN_EMOTION_CONTAINER_CSS_ID, 'emotion'),
});

const globalCache = createCache({
  ...sharedCacheOptions,
  key: EUI_STYLES_GLOBAL,
  container: getEmotionContainer(KBN_EMOTION_CONTAINER_GLOBAL_ID, EUI_STYLES_GLOBAL),
});

const utilitiesCache = createCache({
  ...sharedCacheOptions,
  key: EUI_STYLES_UTILS,
  container: getEmotionContainer(KBN_EMOTION_CONTAINER_UTILS_ID, EUI_STYLES_UTILS),
});

if (typeof document !== 'undefined') {
  console.debug(EMOTION_DEBUG_PREFIX, 'init: wrapping Emotion sheets (browser)', {
    cssContainer: getEmotionContainer(KBN_EMOTION_CONTAINER_CSS_ID, 'emotion')?.id ?? 'head',
    globalContainer: getEmotionContainer(KBN_EMOTION_CONTAINER_GLOBAL_ID, EUI_STYLES_GLOBAL)?.id ?? 'head',
    utilsContainer: getEmotionContainer(KBN_EMOTION_CONTAINER_UTILS_ID, EUI_STYLES_UTILS)?.id ?? 'head',
  });
  wrapSheetInsertTag('css', emotionCache.sheet as Parameters<typeof wrapSheetInsertTag>[1]);
  wrapSheetInsertTag(EUI_STYLES_GLOBAL, globalCache.sheet as Parameters<typeof wrapSheetInsertTag>[1]);
  wrapSheetInsertTag(EUI_STYLES_UTILS, utilitiesCache.sheet as Parameters<typeof wrapSheetInsertTag>[1]);
}

// Enable "compat mode" in Emotion caches.
emotionCache.compat = true;
globalCache.compat = true;
utilitiesCache.compat = true;

const cache = { default: emotionCache, global: globalCache, utility: utilitiesCache };

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
  children,
}) => {
  const { theme$ } = theme;

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
        cache,
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
