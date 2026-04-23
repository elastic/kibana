/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, type ReactNode } from 'react';
import type { ExternalServices } from '../../types';

export const ExternalServicesContext = createContext<ExternalServices | undefined>(undefined);

export interface ExternalServicesProviderProps {
  externalServices?: ExternalServices;
  children: ReactNode;
}

export const ExternalServicesProvider = ({
  externalServices,
  children,
}: ExternalServicesProviderProps) => (
  <ExternalServicesContext.Provider value={externalServices}>
    {children}
  </ExternalServicesContext.Provider>
);
