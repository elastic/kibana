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

import React, { Fragment, FunctionComponent } from 'react';
import { History } from 'history';
import { Router, Route, RouteComponentProps } from 'react-router-dom';

import { Mounter } from '../types';
import { AppContainer } from './app_container';

interface Props {
  mounters: Map<string, Mounter>;
  history: History;
}

interface Params {
  appId: string;
}

export const AppRouter: FunctionComponent<Props> = ({ history, mounters }) => (
  <Router history={history}>
    <Fragment>
      {[...mounters].flatMap(([appId, mounter]) =>
        // Remove /app paths from the routes as they will be handled by the
        // "named" route parameter `:appId` below
        mounter.appBasePath.startsWith('/app')
          ? []
          : [
              <Route
                key={mounter.appRoute}
                path={mounter.appRoute}
                render={() => <AppContainer mounter={mounter} appId={appId} />}
              />,
            ]
      )}
      <Route
        path="/app/:appId"
        render={({
          match: {
            params: { appId },
          },
        }: RouteComponentProps<Params>) => {
          // Find the mounter including legacy mounters with subapps:
          const [id, mounter] = mounters.has(appId)
            ? [appId, mounters.get(appId)]
            : [...mounters].filter(([key]) => key.split(':')[0] === appId)[0] ?? [];

          return <AppContainer mounter={mounter} appId={id} />;
        }}
      />
    </Fragment>
  </Router>
);
