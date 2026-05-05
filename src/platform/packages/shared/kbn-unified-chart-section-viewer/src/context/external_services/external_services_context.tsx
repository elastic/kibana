/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import React, { createContext, useContext, useMemo } from 'react';

export interface ExternalServices {
  discoverShared?: DiscoverSharedPublicStart;
  dataViews?: DataViewsPublicPluginStart;
}

const ExternalServicesContext = createContext<ExternalServices | undefined>(undefined);

export interface ExternalServicesProviderProps {
  externalServices?: ExternalServices;
  children: React.ReactNode;
}

export const ExternalServicesProvider = ({
  externalServices,
  children,
}: ExternalServicesProviderProps) => {
  const value = useMemo(() => externalServices ?? {}, [externalServices]);
  return (
    <ExternalServicesContext.Provider value={value}>{children}</ExternalServicesContext.Provider>
  );
};

export const useExternalServices = (): ExternalServices | undefined => {
  return useContext(ExternalServicesContext);
};
