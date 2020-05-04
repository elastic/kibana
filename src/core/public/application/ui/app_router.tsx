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

import React, { FunctionComponent, useMemo } from 'react';
import { Route, RouteComponentProps, Router, Switch } from 'react-router-dom';
import { History } from 'history';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

import { AppLeaveHandler, AppStatus, Mounter } from '../types';
import { AppContainer } from './app_container';
import { ScopedHistory } from '../scoped_history';

interface Props {
  mounters: Map<string, Mounter>;
  history: History;
  appStatuses$: Observable<Map<string, AppStatus>>;
  setAppLeaveHandler: (appId: string, handler: AppLeaveHandler) => void;
}

interface Params {
  appId: string;
}

export const AppRouter: FunctionComponent<Props> = ({
  history,
  mounters,
  setAppLeaveHandler,
  appStatuses$,
}) => {
  const appStatuses = useObservable(appStatuses$, new Map());
  const createScopedHistory = useMemo(
    () => (appPath: string) => new ScopedHistory(history, appPath),
    [history]
  );

  return (
    <Router history={history}>
      <Switch>
        {[...mounters].flatMap(([appId, mounter]) =>
          // Remove /app paths from the routes as they will be handled by the
          // "named" route parameter `:appId` below
          mounter.appBasePath.startsWith('/app')
            ? []
            : [
                <Route
                  key={mounter.appRoute}
                  path={mounter.appRoute}
                  render={({ match: { url } }) => (
                    <AppContainer
                      appPath={url}
                      appStatus={appStatuses.get(appId) ?? AppStatus.inaccessible}
                      createScopedHistory={createScopedHistory}
                      {...{ appId, mounter, setAppLeaveHandler }}
                    />
                  )}
                />,
              ]
        )}
        <Route
          path="/app/:appId"
          render={({
            match: {
              params: { appId },
              url,
            },
          }: RouteComponentProps<Params>) => {
            // Find the mounter including legacy mounters with subapps:
            const [id, mounter] = mounters.has(appId)
              ? [appId, mounters.get(appId)]
              : [...mounters].filter(([key]) => key.split(':')[0] === appId)[0] ?? [];

            return (
              <AppContainer
                appPath={url}
                appId={id}
                appStatus={appStatuses.get(id) ?? AppStatus.inaccessible}
                createScopedHistory={createScopedHistory}
                {...{ mounter, setAppLeaveHandler }}
              />
            );
          }}
        />
      </Switch>
    </Router>
  );
};
