/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { AppMountParameters } from '@kbn/core/public';
import type { AppPluginDependencies } from './types';

export const renderApp = (
  depsStart: AppPluginDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  const { TopNavMenu } = depsStart.navigation.ui;
  const config = [
    {
      id: 'new',
      label: 'New Button',
      description: 'New Demo',
      run() {},
      testId: 'demoNewButton',
    },
  ];
  const root = createRoot(element);
  root.render(<TopNavMenu appName="demo-app" config={config} />);

  return () => root.unmount();
};
