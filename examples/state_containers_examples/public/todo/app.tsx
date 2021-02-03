/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AppMountParameters, CoreStart } from 'kibana/public';
import ReactDOM from 'react-dom';
import React from 'react';
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
  { appBasePath, element, history: platformHistory }: AppMountParameters,
  { appTitle, historyType }: AppOptions,
  { navigateToApp, exampleLinks }: Deps
) => {
  const history = historyType === History.Browser ? platformHistory : createHashHistory();
  ReactDOM.render(
    <StateContainersExamplesPage navigateToApp={navigateToApp} exampleLinks={exampleLinks}>
      <TodoAppPage history={history} appTitle={appTitle} appBasePath={appBasePath} />
    </StateContainersExamplesPage>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
