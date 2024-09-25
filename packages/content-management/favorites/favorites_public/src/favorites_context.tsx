/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { FavoritesClientPublic } from './favorites_client';

interface FavoritesContextValue {
  favoritesClient?: FavoritesClientPublic;
  notifyError?: (title: JSX.Element, text?: string) => void;
}

const FavoritesContext = React.createContext<FavoritesContextValue | null>(null);

export const FavoritesContextProvider: React.FC<React.PropsWithChildren<FavoritesContextValue>> = ({
  favoritesClient,
  notifyError,
  children,
}) => {
  return (
    <FavoritesContext.Provider value={{ favoritesClient, notifyError }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavoritesContext = () => {
  const context = React.useContext(FavoritesContext);
  return context;
};

export const useFavoritesClient = () => {
  const context = useFavoritesContext();
  return context?.favoritesClient;
};
