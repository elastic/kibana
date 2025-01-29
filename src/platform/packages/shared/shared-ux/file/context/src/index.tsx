/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, type FC, type PropsWithChildren } from 'react';
import type { BaseFilesClient as FilesClient } from '@kbn/shared-ux-file-types';

export interface FilesContextValue {
  /**
   * A files client that will be used process uploads.
   */
  client: FilesClient<any>;
}

const FilesContextObject = createContext<FilesContextValue>(null as unknown as FilesContextValue);

export const useFilesContext = () => {
  const ctx = useContext(FilesContextObject);
  if (!ctx) {
    throw new Error('FilesContext is not found!');
  }
  return ctx;
};

interface ContextProps {
  /**
   * A files client that will be used process uploads.
   */
  client: FilesClient<any>;
  children: React.ReactNode;
}
export const FilesContext: FC<PropsWithChildren<ContextProps>> = ({ client, children }) => {
  return (
    <FilesContextObject.Provider
      value={{
        client,
      }}
    >
      {children}
    </FilesContextObject.Provider>
  );
};
