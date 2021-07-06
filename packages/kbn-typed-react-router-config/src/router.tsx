/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { History } from 'history';
import React, { useMemo } from 'react';
import { Router as ReactRouter } from 'react-router-dom';
import { createRouter } from './create_router';
import { Route } from './types';
import { RouterContextProvider } from './use_router';

export function Router<TRoutes extends Route[]>({
  children,
  history,
  routes,
}: {
  children: React.ReactElement;
  routes: TRoutes;
  history: History;
}) {
  const router = useMemo(() => {
    return createRouter({ history, routes });
  }, [history, routes]);

  return (
    <ReactRouter history={history}>
      <RouterContextProvider router={router}>{children}</RouterContextProvider>
    </ReactRouter>
  );
}
