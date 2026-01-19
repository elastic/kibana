/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';
import type { AlertsFiltersFormContextValue } from '../types';

export const AlertsFiltersFormContext = createContext<AlertsFiltersFormContextValue | undefined>(
  undefined
);

export const AlertsFiltersFormContextProvider = ({
  children,
  value,
}: PropsWithChildren<{ value: AlertsFiltersFormContextValue }>) => {
  return (
    <AlertsFiltersFormContext.Provider value={value}>{children}</AlertsFiltersFormContext.Provider>
  );
};

export const useAlertsFiltersFormContext = () => {
  const context = useContext(AlertsFiltersFormContext);
  if (!context) {
    throw new Error('Missing AlertsFiltersFormContext');
  }
  return context;
};
