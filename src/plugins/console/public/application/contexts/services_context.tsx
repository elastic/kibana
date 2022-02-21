/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, useEffect } from 'react';
import { Observable } from 'rxjs';
import { NotificationsSetup, CoreTheme, DocLinksStart } from 'kibana/public';

import { History, Settings, Storage } from '../../services';
import { ObjectStorageClient } from '../../../common/types';
import { MetricsTracker } from '../../types';
import { EsHostService } from '../lib';

interface ContextServices {
  history: History;
  storage: Storage;
  settings: Settings;
  notifications: NotificationsSetup;
  objectStorageClient: ObjectStorageClient;
  trackUiMetric: MetricsTracker;
  esHostService: EsHostService;
}

export interface ContextValue {
  services: ContextServices;
  docLinkVersion: string;
  theme$: Observable<CoreTheme>;
  docLinks: DocLinksStart['links'];
}

interface ContextProps {
  value: ContextValue;
  children: JSX.Element;
}

const ServicesContext = createContext<ContextValue | null>(null);

export function ServicesContextProvider({ children, value }: ContextProps) {
  useEffect(() => {
    // Fire and forget, we attempt to init the host service once.
    value.services.esHostService.init();
  }, [value.services.esHostService]);

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export const useServicesContext = () => {
  const context = useContext(ServicesContext);
  if (context == null) {
    throw new Error('useServicesContext must be used inside the ServicesContextProvider.');
  }
  return context!;
};
