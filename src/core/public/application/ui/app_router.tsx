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

import { History } from 'history';
import React from 'react';
import { Router, Route } from 'react-router-dom';
import { Subject } from 'rxjs';

import { LegacyApp, AppMount } from '../types';
import { AppContainer } from './app_container';
import { HttpStart } from '../../http';

interface Props {
  apps: ReadonlyMap<string, AppMount>;
  legacyApps: ReadonlyMap<string, LegacyApp>;
  basePath: HttpStart['basePath'];
  currentAppId$: Subject<string | undefined>;
  history: History;
  /**
   * Only necessary for redirecting to legacy apps
   * @deprecated
   */
  redirectTo?: (path: string) => void;
}

export const AppRouter: React.FunctionComponent<Props> = ({
  history,
  redirectTo = (path: string) => (window.location.href = path),
  ...otherProps
}) => (
  <Router history={history}>
    <Route
      path="/app/:appId"
      render={props => <AppContainer redirectTo={redirectTo} {...otherProps} {...props} />}
    />
  </Router>
);
