/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { History } from 'history';
import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { Route, Router, Switch } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import type { MountPoint } from '../../types';
import { ScopedHistory } from '../scoped_history';
import type { AppLeaveHandler, Mounter } from '../types';
import { AppStatus } from '../types';
import { AppContainer } from './app_container';

interface Props {
  mounters: Map<string, Mounter>;
  history: History;
  appStatuses$: Observable<Map<string, AppStatus>>;
  setAppLeaveHandler: (appId: string, handler: AppLeaveHandler) => void;
  setAppActionMenu: (appId: string, mount: MountPoint | undefined) => void;
  setIsMounting: (isMounting: boolean) => void;
}

interface Params {
  appId: string;
}

export const AppRouter: FunctionComponent<Props> = ({
  history,
  mounters,
  setAppLeaveHandler,
  setAppActionMenu,
  appStatuses$,
  setIsMounting,
}) => {
  const appStatuses = useObservable(appStatuses$, new Map());
  const createScopedHistory = useMemo(
    () => (appPath: string) => new ScopedHistory(history, appPath),
    [history]
  );

  return (
    <Router history={history}>
      <Switch>
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
                {...{ appId, mounter, setAppLeaveHandler, setAppActionMenu, setIsMounting }}
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
                {...{ mounter, setAppLeaveHandler, setAppActionMenu, setIsMounting }}
              />
            );
          }}
        />
      </Switch>
    </Router>
  );
};
