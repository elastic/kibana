/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { ENTITY_CENTRIC_LAB_SETTING } from './constants';
import { EntityFlyout } from './entity_flyout';

interface EntityCentricLabContextValue {
  readonly enabled: boolean;
  readonly currentServiceName: string | null;
  readonly openEntity: (serviceName: string) => void;
  readonly closeEntity: () => void;
}

const EntityCentricLabContext = createContext<EntityCentricLabContextValue | null>(null);

export const EntityCentricLabProvider = ({ children }: PropsWithChildren<{}>) => {
  const { uiSettings } = useDiscoverServices();
  // Space-scoped advanced setting; lives in Stack Management → Advanced Settings
  // under the Discover category. `requiresPageReload: true`, so we don't need to
  // subscribe to live updates here — a fresh page render will pick up changes.
  const enabled = useMemo(
    () => uiSettings.get<boolean>(ENTITY_CENTRIC_LAB_SETTING, false),
    [uiSettings]
  );

  const [currentServiceName, setCurrentServiceName] = useState<string | null>(null);

  const openEntity = useCallback((serviceName: string) => {
    setCurrentServiceName(serviceName);
  }, []);

  const closeEntity = useCallback(() => {
    setCurrentServiceName(null);
  }, []);

  const value = useMemo<EntityCentricLabContextValue>(
    () => ({ enabled, currentServiceName, openEntity, closeEntity }),
    [enabled, currentServiceName, openEntity, closeEntity]
  );

  return (
    <EntityCentricLabContext.Provider value={value}>
      {children}
      {enabled && currentServiceName !== null ? (
        <EntityFlyout serviceName={currentServiceName} onClose={closeEntity} />
      ) : null}
    </EntityCentricLabContext.Provider>
  );
};

export const useEntityCentricLab = (): EntityCentricLabContextValue => {
  const ctx = useContext(EntityCentricLabContext);
  if (!ctx) {
    return {
      enabled: false,
      currentServiceName: null,
      openEntity: () => undefined,
      closeEntity: () => undefined,
    };
  }
  return ctx;
};
