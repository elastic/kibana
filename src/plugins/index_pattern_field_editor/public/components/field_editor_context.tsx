/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, FunctionComponent, useMemo } from 'react';

import { ApiService } from '../lib';

interface Context {
  apiService: ApiService;
}

const fieldEditorContext = createContext<Context | undefined>(undefined);

export interface Props {
  apiService: ApiService;
}

export const FieldEditorProvider: FunctionComponent<Props> = ({ apiService, children }) => {
  const ctx = useMemo<Context>(
    () => ({
      apiService,
    }),
    [apiService]
  );

  return <fieldEditorContext.Provider value={ctx}>{children}</fieldEditorContext.Provider>;
};

export const useFieldEditorContext = (): Context => {
  const ctx = useContext(fieldEditorContext);

  if (ctx === undefined) {
    throw new Error('useFieldEditorContext must be used within a <FieldEditorContext />');
  }

  return ctx;
};
