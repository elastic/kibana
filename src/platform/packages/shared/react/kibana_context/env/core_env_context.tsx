/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import type { CoreEnv } from '@kbn/core-base-browser-internal';

/** The environment context */
const CoreEnvContext = createContext<CoreEnv | undefined>(undefined);

/**
 * Hook to access the environment context
 * @throws Error if used outside of KibanaEnvContext
 */
export const useCoreEnv = (): CoreEnv => {
  const context = useContext(CoreEnvContext);
  if (context === undefined) {
    throw new Error('useCoreEnv must be used within an CoreEnvContextProvider');
  }
  return context;
};

/**
 * The environment context provider
 */
export const CoreEnvContextProvider = CoreEnvContext.Provider;
