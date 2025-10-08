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
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

import { App } from './components/app';

export const renderApp = (
  core: CoreStart,
  { navigation }: { navigation: NavigationPublicPluginStart },
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    core.rendering.addContext(
      <App
        // AppDeps
        basename={appBasePath}
        overlays={core.overlays}
        rendering={core.rendering}
        navigation={navigation}
      />
    ),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
