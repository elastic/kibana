/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren, createContext, useContext } from 'react';
import type { ScopedProfilesManager } from './scoped_profiles_manager';

const scopedProfilesManagerContext = createContext<ScopedProfilesManager | undefined>(undefined);

export const ScopedProfilesManagerProvider = ({
  scopedProfilesManager,
  children,
}: PropsWithChildren<{
  scopedProfilesManager: ScopedProfilesManager;
}>) => (
  <scopedProfilesManagerContext.Provider value={scopedProfilesManager}>
    {children}
  </scopedProfilesManagerContext.Provider>
);

export const useScopedProfilesManager = () => {
  const context = useContext(scopedProfilesManagerContext);

  if (!context) {
    throw new Error('useScopedProfilesManager must be used within a ScopedProfilesManagerProvider');
  }

  return context;
};
