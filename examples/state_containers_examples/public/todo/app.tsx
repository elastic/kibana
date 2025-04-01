/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ReactDOM from 'react-dom';
import React from 'react';

import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { createHashHistory } from 'history';
import { TodoAppPage } from './todo';
import { StateContainersExamplesPage, ExampleLink } from '../common/example_page';

export interface AppOptions {
  appTitle: string;
  historyType: History;
}

export enum History {
  Browser,
  Hash,
}

export interface Deps {
  navigateToApp: CoreStart['application']['navigateToApp'];
  exampleLinks: ExampleLink[];
}

export const renderApp = (
  core: CoreStart,
  { appBasePath, element, history: platformHistory }: AppMountParameters,
  { appTitle, historyType }: AppOptions,
  { navigateToApp, exampleLinks }: Deps
) => {
  const history = historyType === History.Browser ? platformHistory : createHashHistory();
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <StateContainersExamplesPage navigateToApp={navigateToApp} exampleLinks={exampleLinks}>
        <TodoAppPage history={history} appTitle={appTitle} appBasePath={appBasePath} />
      </StateContainersExamplesPage>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
