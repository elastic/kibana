/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import React, { createContext, useContext, type FC, type PropsWithChildren } from 'react';
import { ReportingAPIClient } from './reporting_api_client';

interface ContextValue {
  http: HttpSetup;
  apiClient: ReportingAPIClient;
}

const InternalApiClientContext = createContext<undefined | ContextValue>(undefined);

export const InternalApiClientProvider: FC<
  PropsWithChildren<{
    apiClient: ReportingAPIClient;
    http: HttpSetup;
  }>
> = ({ apiClient, http, children }) => {
  return (
    <InternalApiClientContext.Provider value={{ http, apiClient }}>
      {children}
    </InternalApiClientContext.Provider>
  );
};

export const useInternalApiClient = (): ContextValue => {
  const ctx = useContext(InternalApiClientContext);
  if (!ctx) {
    throw new Error('"useInternalApiClient" can only be used inside of "InternalApiClientContext"');
  }
  return ctx;
};
