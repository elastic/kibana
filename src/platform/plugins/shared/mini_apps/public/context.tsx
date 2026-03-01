/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import type { AgentBuilderLike, StartDeps } from './types';
import { createMiniAppsApiClient } from './services';
import type { MiniAppsApiClient } from './services';

export interface MiniAppsContextValue {
  coreStart: CoreStart;
  depsStart: StartDeps;
  apiClient: MiniAppsApiClient;
  history: AppMountParameters['history'];
  agentBuilder?: AgentBuilderLike;
}

const MiniAppsContext = createContext<MiniAppsContextValue | null>(null);

export interface MiniAppsProviderProps {
  coreStart: CoreStart;
  depsStart: StartDeps;
  history: AppMountParameters['history'];
  children: React.ReactNode;
}

export const MiniAppsProvider: React.FC<MiniAppsProviderProps> = ({
  coreStart,
  depsStart,
  history,
  children,
}) => {
  const value = useMemo(
    () => ({
      coreStart,
      depsStart,
      apiClient: createMiniAppsApiClient(coreStart.http),
      history,
      agentBuilder: depsStart.agentBuilder,
    }),
    [coreStart, depsStart, history]
  );

  return <MiniAppsContext.Provider value={value}>{children}</MiniAppsContext.Provider>;
};

export const useMiniAppsContext = (): MiniAppsContextValue => {
  const context = useContext(MiniAppsContext);
  if (!context) {
    throw new Error('useMiniAppsContext must be used within a MiniAppsProvider');
  }
  return context;
};
