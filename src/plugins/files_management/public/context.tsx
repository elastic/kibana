/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, FC } from 'react';

import type { AppContext } from './types';

const FilesManagementAppContext = createContext<AppContext>(null as unknown as AppContext);

export const FilesManagementAppContextProvider: FC<AppContext> = ({ children, filesClient }) => {
  return (
    <FilesManagementAppContext.Provider value={{ filesClient }}>
      {children}
    </FilesManagementAppContext.Provider>
  );
};

export const useFilesManagementContext = () => {
  const ctx = useContext(FilesManagementAppContext);
  if (!ctx) {
    throw new Error(
      'useFilesManagementContext must be used within a FilesManagementAppContextProvider'
    );
  }
  return ctx;
};
