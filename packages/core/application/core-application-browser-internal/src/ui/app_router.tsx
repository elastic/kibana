/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent, useLayoutEffect, useMemo, useState } from 'react';
import { Route, Router, Routes, useLocation, useParams } from 'react-router-dom';
import { History } from 'history';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

import type { CoreTheme } from '@kbn/core-theme-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import { type AppLeaveHandler, AppStatus } from '@kbn/core-application-browser';
import type { Mounter } from '../types';
import { AppContainer } from './app_container';
import { CoreScopedHistory } from '../scoped_history';

interface Props {
  mounters: Map<string, Mounter>;
  history: History;
  theme$: Observable<CoreTheme>;
  appStatuses$: Observable<Map<string, AppStatus>>;
  setAppLeaveHandler: (appId: string, handler: AppLeaveHandler) => void;
  setAppActionMenu: (appId: string, mount: MountPoint | undefined) => void;
  setIsMounting: (isMounting: boolean) => void;
}

export const AppRouter: FunctionComponent<Props> = ({
  history,
  mounters,
  theme$,
  setAppLeaveHandler,
  setAppActionMenu,
  appStatuses$,
  setIsMounting,
}) => {
  const appStatuses = useObservable(appStatuses$, new Map());
  const createScopedHistory = useMemo(
    () => (appPath: string) => new CoreScopedHistory(history, appPath),
    [history]
  );

  const [state, setState] = useState({
    location: history.location,
  });

  useLayoutEffect(() => history.listen((location) => setState({ location })), [history]);

  const LegacyRoute = () => {
    const { appId = '' } = useParams<{ appId: string }>();
    const { pathname } = useLocation();
    const [id, mounter] = mounters.has(appId) ? [appId, mounters.get(appId)] : [];
    return (
      <AppContainer
        appId={id ?? appId}
        appPath={pathname}
        appStatus={appStatuses.get(appId) ?? AppStatus.inaccessible}
        createScopedHistory={createScopedHistory}
        {...{ mounter, setAppLeaveHandler, setAppActionMenu, setIsMounting, theme$ }}
      />
    );
  };

  const AppRoute = ({ appId, mounter }: { appId: string; mounter: Mounter }) => {
    const { path = '' } = useParams<{ path: string }>();
    return (
      <AppContainer
        appPath={path}
        appStatus={appStatuses.get(appId) ?? AppStatus.inaccessible}
        createScopedHistory={createScopedHistory}
        {...{ appId, mounter, setAppLeaveHandler, setAppActionMenu, setIsMounting, theme$ }}
      />
    );
  };
  return (
    <Router navigator={history} location={state.location}>
      <Routes>
        {[...mounters].map(([appId, mounter]) => (
          <Route
            key={mounter.appRoute}
            path={`${mounter.appRoute}${mounter.exactRoute ? '' : '/*'}`}
            element={<AppRoute appId={appId} mounter={mounter} />}
          />
        ))}
        {/* handler for legacy apps and used as a catch-all to display 404 page on not existing /app/appId apps*/}
        <Route path="/app/:appId" element={<LegacyRoute />} />
      </Routes>
    </Router>
  );
};
