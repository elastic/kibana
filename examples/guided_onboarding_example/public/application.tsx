/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { AppPluginStartDependencies } from './types';
import { GuidedOnboardingExampleApp } from './components/app';

export const renderApp = (
  { notifications }: CoreStart,
  { guidedOnboarding }: AppPluginStartDependencies,
  { element, history }: AppMountParameters
) => {
  const root = createRoot(element);

  root.render(
    <GuidedOnboardingExampleApp
      notifications={notifications}
      guidedOnboarding={guidedOnboarding}
      history={history}
    />
  );

  return () => root.unmount();
};
