/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { AppMountParameters, ChromeBreadcrumb, ScopedHistory } from '@kbn/core/public';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import { ManagementAppWrapper } from '../management_app_wrapper';
import { ManagementLandingPage } from '../landing';
import { ManagementSection } from '../../utils';

interface ManagementRouterProps {
  history: AppMountParameters['history'];
  theme$: AppMountParameters['theme$'];
  setBreadcrumbs: (crumbs?: ChromeBreadcrumb[], appHistory?: ScopedHistory) => void;
  onAppMounted: (id: string) => void;
  sections: ManagementSection[];
  landingPageRedirect: string | undefined;
  navigateToUrl: ApplicationStart['navigateToUrl'];
  basePath: HttpStart['basePath'];
}

export const ManagementRouter = memo(
  ({
    history,
    setBreadcrumbs,
    onAppMounted,
    sections,
    theme$,
    landingPageRedirect,
    navigateToUrl,
    basePath,
  }: ManagementRouterProps) => {
    // Redirect the user to the configured landing page if there is one
    useEffect(() => {
      if (landingPageRedirect) {
        navigateToUrl(basePath.prepend(landingPageRedirect));
      }
    }, [landingPageRedirect, navigateToUrl, basePath]);

    return (
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
              <ManagementLandingPage setBreadcrumbs={setBreadcrumbs} onAppMounted={onAppMounted} />
            )}
          />
        </Routes>
      </Router>
    );
  }
);
