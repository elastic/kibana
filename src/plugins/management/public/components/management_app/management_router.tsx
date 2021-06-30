/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import { Route, Router, Switch } from 'react-router-dom';
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
              onAppMounted={onAppMounted}
            />
          )}
        />
      </Switch>
    </Router>
  )
);
