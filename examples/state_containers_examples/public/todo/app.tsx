/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AppMountParameters } from 'kibana/public';
import ReactDOM from 'react-dom';
import React from 'react';
import { createHashHistory } from 'history';
import { TodoAppPage } from './todo';

export interface AppOptions {
  appInstanceId: string;
  appTitle: string;
  historyType: History;
}

export enum History {
  Browser,
  Hash,
}

export const renderApp = (
  { appBasePath, element, history: platformHistory }: AppMountParameters,
  { appInstanceId, appTitle, historyType }: AppOptions
) => {
  const history = historyType === History.Browser ? platformHistory : createHashHistory();
  ReactDOM.render(
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
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
