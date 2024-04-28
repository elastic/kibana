/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@kbn/i18n-react';
import { CoreThemeProvider } from '@kbn/core-theme-browser-internal';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { AppPluginStartDependencies } from './types';
import { UnifiedFieldListExampleApp } from './example_app';

export const renderApp = (
  core: CoreStart,
  deps: AppPluginStartDependencies,
  { element, theme$ }: AppMountParameters
) => {
  const root = createRoot(element);

  root.render(
    <I18nProvider>
      <CoreThemeProvider theme$={theme$}>
        <UnifiedFieldListExampleApp
          services={{
            core,
            ...deps,
          }}
        />
      </CoreThemeProvider>
    </I18nProvider>
  );

  return () => {
    root.unmount();
  };
};
