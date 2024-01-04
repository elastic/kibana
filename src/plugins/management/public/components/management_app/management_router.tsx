/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import {
  AnalyticsServiceStart,
  AppMountParameters,
  ChromeBreadcrumb,
  ScopedHistory,
} from '@kbn/core/public';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { ManagementAppWrapper } from '../management_app_wrapper';
import { ManagementLandingPage } from '../landing';
import { ManagementSection } from '../../utils';

interface ManagementRouterProps {
  history: AppMountParameters['history'];
  theme$: AppMountParameters['theme$'];
  setBreadcrumbs: (crumbs?: ChromeBreadcrumb[], appHistory?: ScopedHistory) => void;
  onAppMounted: (id: string) => void;
  sections: ManagementSection[];
  analytics: AnalyticsServiceStart;
}

export const ManagementRouter = memo(
  ({
    history,
    setBreadcrumbs,
    onAppMounted,
    sections,
    theme$,
    analytics,
  }: ManagementRouterProps) => {
    return (
      <KibanaErrorBoundaryProvider analytics={analytics}>
        <KibanaErrorBoundary>
          <Router history={history}>
            <Routes>
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
                          theme$={theme$}
                        />
                      )}
                    />
                  ))
              )}
              {sections.map((section) =>
                section
                  .getAppsEnabled()
                  .filter((app) => app.redirectFrom)
                  .map((app) => <Redirect path={`/${app.redirectFrom}*`} to={`${app.basePath}*`} />)
              )}

              <Route
                path={'/'}
                component={() => (
                  <ManagementLandingPage
                    setBreadcrumbs={setBreadcrumbs}
                    onAppMounted={onAppMounted}
                  />
                )}
              />
            </Routes>
          </Router>
        </KibanaErrorBoundary>
      </KibanaErrorBoundaryProvider>
    );
  }
);
