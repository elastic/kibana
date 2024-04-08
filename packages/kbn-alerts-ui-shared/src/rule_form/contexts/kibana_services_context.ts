/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { createContext, useContext } from 'react';

export interface RuleFormKibanaServices {
  http: HttpStart;
  toasts: ToastsStart;
}

const KibanaServicesContext = createContext<RuleFormKibanaServices>({
  http: {} as HttpStart,
  toasts: {} as ToastsStart,
});

export const KibanaServicesProvider = KibanaServicesContext.Provider;
export const useKibanaServices = () => useContext(KibanaServicesContext);
