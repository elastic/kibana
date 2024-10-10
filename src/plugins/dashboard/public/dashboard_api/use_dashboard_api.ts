/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import { DashboardApi } from './types';

export const DashboardContext = createContext<DashboardApi | undefined>(undefined);

export const useDashboardApi = (): DashboardApi => {
  const api = useContext<DashboardApi | undefined>(DashboardContext);
  if (!api) {
    throw new Error('useDashboardApi must be used inside DashboardContext');
  }
  return api;
};
