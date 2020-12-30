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

import React, { memo } from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import { EuiPageBody } from '@elastic/eui';
import { AppMountParameters, ChromeBreadcrumb, ScopedHistory } from 'kibana/public';
import { ManagementAppWrapper } from '../management_app_wrapper';
import { ManagementLandingPage } from '../landing';
import { ManagementAppDependencies } from './management_app';
import { ManagementSection } from '../../utils';

interface ManagementRouterProps {
  history: AppMountParameters['history'];
  dependencies: ManagementAppDependencies;
  setBreadcrumbs: (crumbs?: ChromeBreadcrumb[], appHistory?: ScopedHistory) => void;
  onAppMounted: (id: string) => void;
  sections: ManagementSection[];
}

export const ManagementRouter = memo(
  ({ dependencies, history, setBreadcrumbs, onAppMounted, sections }: ManagementRouterProps) => (
    <Router history={history}>
      <EuiPageBody restrictWidth={false} className="mgtPage__body">
        <Switch>
          {sections.map((section) =>
            section
              .getAppsEnabled()
              .map((app) => (
                <Route
                  path={`${app.basePath}`}
                  component={() => (
                    <ManagementAppWrapper
                      app={app}
                      setBreadcrumbs={setBreadcrumbs}
                      onAppMounted={onAppMounted}
                      history={history}
                    />
                  )}
                />
              ))
          )}
          <Route
            path={'/'}
            component={() => (
              <ManagementLandingPage
                version={dependencies.kibanaVersion}
                setBreadcrumbs={setBreadcrumbs}
              />
            )}
          />
        </Switch>
      </EuiPageBody>
    </Router>
  )
);
