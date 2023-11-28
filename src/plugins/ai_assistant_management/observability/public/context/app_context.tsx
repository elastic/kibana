/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { CoreStart, HttpSetup } from '@kbn/core/public';
import type { StartDependencies } from '../plugin';

interface ContextValue extends StartDependencies {
  http: HttpSetup;
  navigateToApp: CoreStart['application']['navigateToApp'];
  notifications: CoreStart['notifications'];
  uiSettings: CoreStart['uiSettings'];
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}

const AppContext = createContext<ContextValue>(null as any);

export const AppContextProvider = ({
  children,
  value,
}: {
  value: ContextValue;
  children: React.ReactNode;
}) => {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('"useAppContext" can only be called inside of AppContext.Provider!');
  }
  return ctx;
};
