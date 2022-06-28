/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
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
    key: 'eui',
    container: document.querySelector(`meta[name="eui-global"]`) as HTMLElement,
  });
  const emotionCache = createCache({
    key: 'css',
    container: document.querySelector(`meta[name="emotion"]`) as HTMLElement,
  });
  emotionCache.compat = true;

  return (
    <EuiProvider colorMode={colorMode} cache={{ default: emotionCache, global: globalCache }}>
      {storyFn()}
    </EuiProvider>
  );
};

export const decorators = [EuiProviderDecorator];
