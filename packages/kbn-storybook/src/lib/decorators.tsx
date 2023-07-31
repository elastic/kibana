/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import type { DecoratorFn } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n-react';

import 'core_styles';
import { BehaviorSubject } from 'rxjs';
import { CoreTheme } from '@kbn/core-theme-browser';
import { I18nStart } from '@kbn/core-i18n-browser';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

const theme$ = new BehaviorSubject<CoreTheme>({ darkMode: false });

const i18n: I18nStart = {
  Context: ({ children }) => <I18nProvider>{children}</I18nProvider>,
};

/**
 * Storybook decorator using the `KibanaContextProvider`. Uses the value from
 * `globals` provided by the Storybook theme switcher to set the `colorMode`.
 */
const KibanaContextDecorator: DecoratorFn = (storyFn, { globals }) => {
  const colorMode = globals.euiTheme === 'v8.dark' ? 'dark' : 'light';

  useEffect(() => {
    theme$.next({ darkMode: colorMode === 'dark' });
  }, [colorMode]);

  return (
    <KibanaRenderContextProvider {...{ theme: { theme$ }, i18n }}>
      {storyFn()}
    </KibanaRenderContextProvider>
  );
};

export const decorators = [KibanaContextDecorator];
