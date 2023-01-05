/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Definition of the gainsight API.
 */
export interface GainsightApi {
  init?: boolean;
  (functionId: keyof Mapping, ...options: any): void;
}

interface Mapping {
  identify: (id: string, userVars?: Record<string, unknown>) => void;
  track: (event: string, data?: any) => void;
  set: (event: string, data?: any) => void;
  reset: () => void;
  config: (options: any) => void;
}

declare global {
  interface Window {
    aptrinsic: GainsightApi;
  }
}
