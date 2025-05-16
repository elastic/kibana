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
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { AppPluginStartDependencies } from './types';
import { GuidedOnboardingExampleApp } from './components/app';

export const renderApp = (
  coreStart: CoreStart,
  { guidedOnboarding }: AppPluginStartDependencies,
  { element, history }: AppMountParameters
) => {
  const { notifications } = coreStart;
  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <GuidedOnboardingExampleApp
        notifications={notifications}
        guidedOnboarding={guidedOnboarding}
        history={history}
      />
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
