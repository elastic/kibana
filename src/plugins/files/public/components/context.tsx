/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, type FunctionComponent } from 'react';
import { FileKindsRegistry, getFileKindsRegistry } from '../../common/file_kinds_registry';
import type { FilesClient } from '../types';

export interface FilesContextValue {
  registry: FileKindsRegistry;
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
}
export const FilesContext: FunctionComponent<ContextProps> = ({ client, children }) => {
  return (
    <FilesContextObject.Provider
      value={{
        client,
        registry: getFileKindsRegistry(),
      }}
    >
      {children}
    </FilesContextObject.Provider>
  );
};
