/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreStart } from '@kbn/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { GuidedOnboardingExampleApp } from './components/app';
import { AppPluginStartDependencies } from './types';

export const renderApp = (
  { notifications }: CoreStart,
  { guidedOnboarding }: AppPluginStartDependencies,
  { element, history }: AppMountParameters
) => {
  ReactDOM.render(
    <GuidedOnboardingExampleApp
      notifications={notifications}
      guidedOnboarding={guidedOnboarding}
      history={history}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
