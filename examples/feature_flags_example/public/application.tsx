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
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { KibanaRootContextProvider } from '@kbn/react-kibana-context-root';
import { FeatureFlagsExampleApp } from './components/app';

export const renderApp = (coreStart: CoreStart, { element }: AppMountParameters) => {
  const { notifications, http, featureFlags } = coreStart;
  ReactDOM.render(
    <KibanaRootContextProvider {...coreStart}>
      <KibanaPageTemplate>
        <FeatureFlagsExampleApp
          featureFlags={featureFlags}
          notifications={notifications}
          http={http}
        />
      </KibanaPageTemplate>
    </KibanaRootContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
