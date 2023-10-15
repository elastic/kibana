/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';

import { ErrorBoundaryServices } from '../../types';
import { ErrorService } from './error_service';
import { StatefulToastList, ToastsService } from './toasts_service';

const Context = React.createContext<ErrorBoundaryServices | null>(null);

/**
 * A Context Provider for Jest and Storybooks
 */
export const ErrorBoundaryProvider: FC<ErrorBoundaryServices> = ({
  children,
  reloadWindow,
  errorService,
  toastsService,
}) => {
  return (
    <Context.Provider value={{ reloadWindow, errorService, toastsService }}>
      {children}
      <StatefulToastList toasts$={toastsService.toasts$} />
    </Context.Provider>
  );
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const ErrorBoundaryKibanaProvider: FC = ({ children }) => {
  const reloadWindow = () => window.location.reload();
  const toastsService = new ToastsService({ reloadWindow });

  const value: ErrorBoundaryServices = {
    reloadWindow,
    errorService: new ErrorService(),
    toastsService,
  };

  return (
    <Context.Provider value={value}>
      {children}
      <StatefulToastList toasts$={toastsService.toasts$} />
    </Context.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useErrorBoundary(): ErrorBoundaryServices {
  const context = useContext(Context);
  if (!context) {
    throw new Error(
      'Kibana Error Boundary Context is missing. Ensure your component or React root is wrapped with Kibana Error Boundary Context.'
    );
  }

  return context;
}
