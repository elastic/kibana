/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import type { History } from 'history';
import type { Observable } from 'rxjs';
import { EMPTY } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

import type { CoreTheme } from '@kbn/core-theme-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import { type AppLeaveHandler, AppStatus } from '@kbn/core-application-browser';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { Mounter } from '../types';
import { resolveAppRoute } from '../utils';
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
            <Route
              render={({ location }) => {
                const resolved = resolveAppRoute(location.pathname, mounters);
                if (!resolved) {
                  return null;
                }

                return (
                  <AppContainer
                    key={resolved.appId}
                    appPath={resolved.appPath}
                    appId={resolved.appId}
                    appStatus={appStatuses.get(resolved.appId) ?? AppStatus.inaccessible}
                    mounter={resolved.mounter}
                    createScopedHistory={createScopedHistory}
                    setAppLeaveHandler={setAppLeaveHandler}
                    setAppActionMenu={setAppActionMenu}
                    setIsMounting={setIsMounting}
                    theme$={theme$}
                    showPlainSpinner={showPlainSpinner}
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
