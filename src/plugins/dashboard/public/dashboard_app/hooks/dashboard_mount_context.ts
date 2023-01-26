/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext } from 'react';

import { ScopedHistory } from '@kbn/core-application-browser';

import { DashboardMountContextProps } from '../types';

export const DashboardMountContext = createContext<DashboardMountContextProps>({
  // default values for the dashboard mount context
  restorePreviousUrl: () => {},
  scopedHistory: () => ({} as ScopedHistory),
  onAppLeave: (handler) => {},
  setHeaderActionMenu: (mountPoint) => {},
});

export const useDashboardMountContext = () => {
  return useContext(DashboardMountContext);
};
