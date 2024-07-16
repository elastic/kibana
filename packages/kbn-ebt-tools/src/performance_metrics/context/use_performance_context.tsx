/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext } from 'react';

export interface PerformanceApi {
  onPageReady(): void;
}

export const PerformanceContext = createContext<PerformanceApi | undefined>(undefined);

export function usePerformanceContext() {
  const api = useContext(PerformanceContext);

  if (!api) {
    throw new Error('Missing Performance API in context');
  }

  return api;
}
