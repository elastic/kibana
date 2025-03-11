/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  FieldInputKibanaProvider,
  FieldInputProvider,
} from '@kbn/management-settings-components-field-input/services';
import React, { FC, PropsWithChildren, useContext } from 'react';

import type { FieldRowServices, FieldRowKibanaDependencies, Services } from './types';

const FieldRowContext = React.createContext<Services | null>(null);

/**
 * Props for {@link FieldRowProvider}.
 */
export interface FieldRowProviderProps extends FieldRowServices {
  children: React.ReactNode;
}

/**
 * React Provider that provides services to a {@link FieldRow} component and its dependents.\
 */
export const FieldRowProvider = ({ children, ...services }: FieldRowProviderProps) => {
  // Typescript types are widened to accept more than what is needed.  Take only what is necessary
  // so the context remains clean.
  const { links, showDanger, validateChange } = services;

  return (
    <FieldRowContext.Provider value={{ links }}>
      <FieldInputProvider {...{ showDanger, validateChange }}>{children}</FieldInputProvider>
    </FieldRowContext.Provider>
  );
};

/**
 * Kibana-specific Provider that maps Kibana plugins and services to a {@link FieldRowProvider}.
 */
export const FieldRowKibanaProvider: FC<PropsWithChildren<FieldRowKibanaDependencies>> = ({
  children,
  docLinks,
  notifications,
  settings,
}) => {
  return (
    <FieldRowContext.Provider
      value={{
        links: docLinks.links.management,
      }}
    >
      <FieldInputKibanaProvider {...{ notifications, settings }}>
        {children}
      </FieldInputKibanaProvider>
    </FieldRowContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export const useServices = () => {
  const context = useContext(FieldRowContext);

  if (!context) {
    throw new Error(
      'FieldRowContext is missing.  Ensure your component or React root is wrapped with FieldRowProvider.'
    );
  }

  return context;
};
