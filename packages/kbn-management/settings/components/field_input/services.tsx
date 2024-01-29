/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import type { FieldInputServices, FieldInputKibanaDependencies } from './types';

const FieldInputContext = React.createContext<FieldInputServices | null>(null);

/**
 * React Provider that provides services to a {@link FieldInput} component and its dependents.
 */
export const FieldInputProvider: FC<FieldInputServices> = ({ children, ...services }) => {
  // Typescript types are widened to accept more than what is needed.  Take only what is necessary
  // so the context remains clean.
  const { showDanger, validateChange } = services;

  return (
    <FieldInputContext.Provider value={{ showDanger, validateChange }}>
      {children}
    </FieldInputContext.Provider>
  );
};

/**
 * Kibana-specific Provider that maps Kibana plugins and services to a {@link FieldInputProvider}.
 */
export const FieldInputKibanaProvider: FC<FieldInputKibanaDependencies> = ({
  children,
  notifications: { toasts },
  settings: { client },
}) => {
  return (
    <FieldInputContext.Provider
      value={{
        showDanger: (message) => toasts.addDanger(message),
        validateChange: async (key, value) => {
          return await client.validateValue(key, value);
        },
      }}
    >
      {children}
    </FieldInputContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 *
 * @see {@link FieldInputServices}
 */
export const useServices = () => {
  const context = useContext(FieldInputContext);

  if (!context) {
    throw new Error(
      'FieldInputContext is missing.  Ensure your component or React root is wrapped with FieldInputProvider.'
    );
  }

  return context;
};
