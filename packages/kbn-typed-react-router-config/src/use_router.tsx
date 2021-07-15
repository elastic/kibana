/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import { Route, Router } from './types';

const RouterContext = createContext<Router<Route[]> | undefined>(undefined);

export const RouterContextProvider = ({
  router,
  children,
}: {
  router: Router<Route[]>;
  children: React.ReactElement;
}) => <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;

export function useRouter(): Router<Route[]> {
  const router = useContext(RouterContext);

  if (!router) {
    throw new Error('Router not found in context');
  }

  return router;
}
