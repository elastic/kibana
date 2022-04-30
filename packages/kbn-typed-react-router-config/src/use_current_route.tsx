/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { createContext, useContext } from 'react';
import { OutletContextProvider } from './outlet';
import { RouteMatch } from './types';

const CurrentRouteContext = createContext<
  { match: RouteMatch; element: React.ReactElement } | undefined
>(undefined);

export const CurrentRouteContextProvider = ({
  match,
  element,
  children,
}: {
  match: RouteMatch;
  element: React.ReactElement;
  children: React.ReactElement;
}) => {
  return (
    <CurrentRouteContext.Provider value={{ match, element }}>
      <OutletContextProvider element={element}>{children}</OutletContextProvider>
    </CurrentRouteContext.Provider>
  );
};

export const useCurrentRoute = () => {
  const currentRoute = useContext(CurrentRouteContext);
  if (!currentRoute) {
    throw new Error('No match was found in context');
  }
  return currentRoute;
};
