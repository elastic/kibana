/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { OnFieldChangeFn } from '@kbn/management-settings-types';

const ChangeHandlerContext = React.createContext<OnFieldChangeFn | null>(null);

/**
 * Props for {@link ChangeHandlerProvider}.
 */
export interface ChangeHandlerProviderProps {
  children: React.ReactNode;
  onFieldChangeFn: OnFieldChangeFn;
}

/**
 * React Provider that provides an onFieldChange handler.
 */
export const ChangeHandlerProvider = ({
  children,
  onFieldChangeFn,
}: ChangeHandlerProviderProps) => {
  return (
    <ChangeHandlerContext.Provider value={onFieldChangeFn}>
      {children}
    </ChangeHandlerContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export const useOnFieldChange = () => {
  const context = useContext(ChangeHandlerContext);

  if (!context) {
    throw new Error(
      'ChangeHandlerContext is missing. Ensure your component or React root is wrapped with ChangeHandlerContext.'
    );
  }

  return context;
};
