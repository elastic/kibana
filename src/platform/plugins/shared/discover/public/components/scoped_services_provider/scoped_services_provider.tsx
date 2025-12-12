/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren, createContext, useContext, useMemo } from 'react';
import type { ScopedProfilesManager } from '../../context_awareness';
import type { ScopedDiscoverEBTManager } from '../../ebt_manager';

interface ScopedServices {
  scopedProfilesManager: ScopedProfilesManager;
  scopedEBTManager: ScopedDiscoverEBTManager;
}

const scopedServicesContext = createContext<ScopedServices | undefined>(undefined);

export const ScopedServicesProvider = ({
  scopedProfilesManager,
  scopedEBTManager,
  children,
}: PropsWithChildren<ScopedServices>) => {
  const scopedServices = useMemo(
    () => ({ scopedProfilesManager, scopedEBTManager }),
    [scopedEBTManager, scopedProfilesManager]
  );

  return (
    <scopedServicesContext.Provider value={scopedServices}>
      {children}
    </scopedServicesContext.Provider>
  );
};

export const useScopedServices = () => {
  const context = useContext(scopedServicesContext);

  if (!context) {
    throw new Error('useScopedServices must be used within a ScopedServicesProvider');
  }

  return context;
};
