/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { AppPluginStartDependencies } from './types';
import { UnifiedFieldListExampleApp } from './example_app';

export const renderApp = (
  core: CoreStart,
  deps: AppPluginStartDependencies,
  { element, theme$ }: AppMountParameters
) => {
  ReactDOM.render(
    <I18nProvider>
      <KibanaThemeProvider theme={{ theme$ }}>
        <UnifiedFieldListExampleApp
          services={{
            core,
            ...deps,
          }}
        />
      </KibanaThemeProvider>
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
