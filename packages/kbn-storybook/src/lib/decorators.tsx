/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import React, { useEffect } from 'react';
import { action } from '@storybook/addon-actions';
import type { DecoratorFn } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n-react';

import 'core_styles';
import { BehaviorSubject } from 'rxjs';
import { CoreTheme } from '@kbn/core-theme-browser';
import { I18nStart } from '@kbn/core-i18n-browser';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { KibanaRootContextProvider } from '@kbn/react-kibana-context-root';

const theme$ = new BehaviorSubject<CoreTheme>({ darkMode: false });

const i18n: I18nStart = {
  Context: ({ children }) => <I18nProvider>{children}</I18nProvider>,
};

const analytics: AnalyticsServiceStart = {
  reportEvent: action('Report telemetry event'),
  optIn: action('Opt in'),
  telemetryCounter$: new Subject(),
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
    <KibanaRootContextProvider {...{ theme: { theme$ }, analytics, i18n }}>
      {storyFn()}
    </KibanaRootContextProvider>
  );
};

export const decorators = [KibanaContextDecorator];
