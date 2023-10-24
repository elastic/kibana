/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext, useMemo } from 'react';

import { KibanaErrorBoundaryServices } from '../../types';
import { KibanaErrorService } from './error_service';

const Context = React.createContext<KibanaErrorBoundaryServices | null>(null);

/**
 * A Context Provider for Jest and Storybooks
 */
export const KibanaErrorBoundaryDepsProvider: FC<KibanaErrorBoundaryServices> = ({
  children,
  onClickRefresh,
  errorService,
}) => {
  return <Context.Provider value={{ onClickRefresh, errorService }}>{children}</Context.Provider>;
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const KibanaErrorBoundaryProvider: FC = ({ children }) => {
  const value: KibanaErrorBoundaryServices = useMemo(
    () => ({
      onClickRefresh: () => window.location.reload(),
      errorService: new KibanaErrorService(),
    }),
    []
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

/**
 * React hook for accessing pre-wired services.
 */
export function useErrorBoundary(): KibanaErrorBoundaryServices {
  const context = useContext(Context);
  if (!context) {
    throw new Error(
      'Kibana Error Boundary Context is missing. Ensure your component or React root is wrapped with Kibana Error Boundary Context.'
    );
  }

  return context;
}
