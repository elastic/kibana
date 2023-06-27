/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { AppPluginStartDependencies } from './types';
import { UnifiedFieldListExampleApp } from './example_app';

export const renderApp = (
  core: CoreStart,
  deps: AppPluginStartDependencies,
  { element }: AppMountParameters
) => {
  ReactDOM.render(
    <I18nProvider>
      <UnifiedFieldListExampleApp
        services={{
          core,
          uiSettings: core.uiSettings,
          ...deps,
        }}
      />
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
