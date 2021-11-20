/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { RacExampleClientStartDeps } from './types';
import { KibanaContextProvider } from '../../../src/plugins/kibana_react/public';
import { RacExample } from './components/app';

export const renderApp = (
  core: CoreStart,
  plugins: RacExampleClientStartDeps,
  { appBasePath, element, history }: AppMountParameters
) => {
  ReactDOM.render(
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      <RacExample
        basename={appBasePath}
        http={core.http}
        triggersActionsUi={plugins.triggersActionsUi}
        navigateToApp={core.application.navigateToApp}
      />
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
