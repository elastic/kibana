/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { AppMountParameters } from 'kibana/public';
import ReactDOM from 'react-dom';
import React from 'react';
import { createHashHistory, createBrowserHistory } from 'history';
import { TodoAppPage } from './todo';

export interface AppOptions {
  appInstanceId: string;
  historyType: History;
}

export enum History {
  Browser,
  Hash,
}

export const renderApp = (
  { appBasePath, element }: AppMountParameters,
  { appInstanceId, historyType }: AppOptions
) => {
  const history =
    historyType === History.Browser
      ? createBrowserHistory({ basename: appBasePath })
      : createHashHistory();
  ReactDOM.render(
    <TodoAppPage history={history} appInstanceId={appInstanceId} appBasePath={appBasePath} />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
