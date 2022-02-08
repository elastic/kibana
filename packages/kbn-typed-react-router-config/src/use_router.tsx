/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import { RouteMap, Router } from './types';

const RouterContext = createContext<Router<RouteMap> | undefined>(undefined);

export const RouterContextProvider = ({
  router,
  children,
}: {
  router: Router<RouteMap>;
  children: React.ReactNode;
}) => <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;

export function useRouter(): Router<RouteMap> {
  const router = useContext(RouterContext);

  if (!router) {
    throw new Error('Router not found in context');
  }

  return router;
}
