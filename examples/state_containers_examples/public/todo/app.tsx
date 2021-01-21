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
import { StateContainersExamplesPage } from '../common/page';

export interface AppOptions {
  appInstanceId: string;
  appTitle: string;
  historyType: History;
}

export enum History {
  Browser,
  Hash,
}

export interface Deps {
  navigateToApp: CoreStart['application']['navigateToApp'];
}

export const renderApp = (
  { appBasePath, element, history: platformHistory }: AppMountParameters,
  { appInstanceId, appTitle, historyType }: AppOptions,
  { navigateToApp }: Deps
) => {
  const history = historyType === History.Browser ? platformHistory : createHashHistory();
  ReactDOM.render(
    <StateContainersExamplesPage navigateToApp={navigateToApp}>
      <TodoAppPage
        history={history}
        appInstanceId={appInstanceId}
        appTitle={appTitle}
        appBasePath={appBasePath}
        isInitialRoute={() => {
          const stripTrailingSlash = (path: string) =>
            path.charAt(path.length - 1) === '/' ? path.substr(0, path.length - 1) : path;
          const currentAppUrl = stripTrailingSlash(history.createHref(history.location));
          if (historyType === History.Browser) {
            // browser history
            return currentAppUrl === '' && !history.location.search && !history.location.hash;
          } else {
            // hashed history
            return currentAppUrl === '#' && !history.location.search;
          }
        }}
      />
    </StateContainersExamplesPage>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
