/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, FunctionComponent, useMemo } from 'react';
import { NotificationsStart } from 'src/core/public';
import type { IndexPattern, DataPublicPluginStart } from '../shared_imports';
import { ApiService } from '../lib';

export interface Context {
  indexPattern: IndexPattern;
  services: {
    search: DataPublicPluginStart['search'];
    api: ApiService;
    notifications: NotificationsStart;
  };
}

const fieldEditorContext = createContext<Context | undefined>(undefined);

export const FieldEditorProvider: FunctionComponent<Context> = ({
  services,
  indexPattern,
  children,
}) => {
  const ctx = useMemo<Context>(
    () => ({
      indexPattern,
      services,
    }),
    [indexPattern, services]
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

export const useFieldEditorServices = () => useFieldEditorContext().services;
