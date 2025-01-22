/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { History } from 'history';
import React from 'react';
import { Router as ReactRouter } from '@kbn/shared-ux-router';

import { RouteMap, Router } from './types';
import { RouterContextProvider } from './use_router';

export function RouterProvider({
  children,
  router,
  history,
}: {
  router: Router<RouteMap>;
  history: History;
  children?: React.ReactNode;
}) {
  return (
    <ReactRouter history={history}>
      <RouterContextProvider router={router}>{children}</RouterContextProvider>
    </ReactRouter>
  );
}
