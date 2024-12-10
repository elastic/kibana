/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import { DashboardInternalApi } from './types';

export const DashboardInternalContext = createContext<DashboardInternalApi | undefined>(undefined);

export const useDashboardInternalApi = (): DashboardInternalApi => {
  const internalApi = useContext<DashboardInternalApi | undefined>(DashboardInternalContext);
  if (!internalApi) {
    throw new Error('useDashboardInternalApi must be used inside DashboardContext');
  }
  return internalApi;
};
