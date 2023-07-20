/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EUI_STYLES_GLOBAL, EUI_STYLES_UTILS } from '@kbn/core-base-common';
import { EuiProvider } from '@elastic/eui';
import createCache from '@emotion/cache';
import type { DecoratorFn } from '@storybook/react';

import 'core_styles';

/**
 * Storybook decorator using the EUI provider. Uses the value from
 * `globals` provided by the Storybook theme switcher.
 */
const EuiProviderDecorator: DecoratorFn = (storyFn, { globals }) => {
  const colorMode = globals.euiTheme === 'v8.dark' ? 'dark' : 'light';
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

  return (
    <EuiProvider
      colorMode={colorMode}
      cache={{ default: emotionCache, global: globalCache, utility: utilitiesCache }}
    >
      {storyFn()}
    </EuiProvider>
  );
};

export const decorators = [EuiProviderDecorator];
