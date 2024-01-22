/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent, useMemo } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { History } from 'history';
import { EMPTY, Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

import type { CoreTheme } from '@kbn/core-theme-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import { type AppLeaveHandler, AppStatus } from '@kbn/core-application-browser';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { Mounter } from '../types';
import { AppContainer } from './app_container';
import { CoreScopedHistory } from '../scoped_history';

interface Props {
  analytics: AnalyticsServiceStart;
  mounters: Map<string, Mounter>;
  history: History;
  theme$: Observable<CoreTheme>;
  appStatuses$: Observable<Map<string, AppStatus>>;
  setAppLeaveHandler: (appId: string, handler: AppLeaveHandler) => void;
  setAppActionMenu: (appId: string, mount: MountPoint | undefined) => void;
  setIsMounting: (isMounting: boolean) => void;
  hasCustomBranding$?: Observable<boolean>;
}

interface Params {
  appId: string;
}

export const AppRouter: FunctionComponent<Props> = ({
  history,
  analytics,
  mounters,
  theme$,
  setAppLeaveHandler,
  setAppActionMenu,
  appStatuses$,
  setIsMounting,
  hasCustomBranding$,
}) => {
  const appStatuses = useObservable(appStatuses$, new Map());
  const createScopedHistory = useMemo(
    () => (appPath: string) => new CoreScopedHistory(history, appPath),
    [history]
  );

  const showPlainSpinner = useObservable(hasCustomBranding$ ?? EMPTY, false);

  return (
    <KibanaErrorBoundaryProvider analytics={analytics}>
      <KibanaErrorBoundary>
        <Router history={history}>
          <Routes>
            {[...mounters].map(([appId, mounter]) => (
              <Route
                key={mounter.appRoute}
                path={mounter.appRoute}
                exact={mounter.exactRoute}
                render={({ match: { path } }) => (
                  <AppContainer
                    appPath={path}
                    appStatus={appStatuses.get(appId) ?? AppStatus.inaccessible}
                    createScopedHistory={createScopedHistory}
                    {...{
                      appId,
                      mounter,
                      setAppLeaveHandler,
                      setAppActionMenu,
                      setIsMounting,
                      theme$,
                      showPlainSpinner,
                    }}
                  />
                )}
              />
            ))}
            {/* handler for legacy apps and used as a catch-all to display 404 page on not existing /app/appId apps*/}
            <Route
              path="/app/:appId"
              render={({
                match: {
                  params: { appId },
                  url,
                },
              }: RouteComponentProps<Params>) => {
                // the id/mounter retrieval can be removed once #76348 is addressed
                const [id, mounter] = mounters.has(appId) ? [appId, mounters.get(appId)] : [];
                return (
                  <AppContainer
                    appPath={url}
                    appId={id ?? appId}
                    appStatus={appStatuses.get(appId) ?? AppStatus.inaccessible}
                    createScopedHistory={createScopedHistory}
                    {...{
                      mounter,
                      setAppLeaveHandler,
                      setAppActionMenu,
                      setIsMounting,
                      theme$,
                      showPlainSpinner,
                    }}
                  />
                );
              }}
            />
          </Routes>
        </Router>
      </KibanaErrorBoundary>
    </KibanaErrorBoundaryProvider>
  );
};
