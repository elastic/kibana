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
  | {
      match: RouteMatch;
      element: React.ReactElement;
      hasExactMatch: boolean;
      errorMessage?: string;
    }
  | undefined
>(undefined);

export const CurrentRouteContextProvider = ({
  match,
  element,
  hasExactMatch,
  errorMessage,
  children,
}: {
  match: RouteMatch;
  element: React.ReactElement;
  hasExactMatch: boolean;
  errorMessage?: string;
  children: React.ReactElement;
}) => {
  return (
    <CurrentRouteContext.Provider value={{ match, element, hasExactMatch, errorMessage }}>
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
