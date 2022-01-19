/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, createContext, useContext } from 'react';

interface WithDrift {
  enabled: false;
}

interface WithoutDrift {
  enabled: true;
  chatURL: string;

  // These are here for PoC purposes *only*.  They should be replaced with actual implementations
  // as the PoC matures.
  pocJWT: string;
  pocID: string;
  pocEmail: string;
}

type DriftService = WithDrift | WithoutDrift;

interface EngagementServices {
  drift: DriftService;
}

const ServicesContext = createContext<EngagementServices>({ drift: { enabled: false } });

export const ServicesProvider: FC<EngagementServices> = ({ children, ...services }) => (
  <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
);

/**
 * React hook for accessing the pre-wired `EngagementServices`.
 */
export function useServices() {
  return useContext(ServicesContext);
}

export function useDrift(): DriftService {
  const { drift } = useServices();

  return drift;
}
