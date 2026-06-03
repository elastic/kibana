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
import {
  EntityFlyout,
  EntityFlyoutServicesProvider,
  isEntityTypeEnabled,
  resolveEntityTypeIdForName,
} from '@kbn/entity-centric-lab-flyout';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { ENTITY_CENTRIC_LAB_SETTING } from './constants';

interface EntityCentricLabContextValue {
  readonly enabled: boolean;
  readonly currentEntityName: string | null;
  readonly openEntity: (entityName: string) => void;
  readonly closeEntity: () => void;
}

const EntityCentricLabContext = createContext<EntityCentricLabContextValue | null>(null);

export const EntityCentricLabProvider = ({ children }: PropsWithChildren<{}>) => {
  const { uiSettings, agentBuilder, notifications, charts } = useDiscoverServices();
  // Space-scoped advanced setting; lives in Stack Management → Advanced Settings
  // under the Discover category. `requiresPageReload: true`, so we don't need to
  // subscribe to live updates here — a fresh page render will pick up changes.
  const enabled = useMemo(
    () => uiSettings.get<boolean>(ENTITY_CENTRIC_LAB_SETTING, false),
    [uiSettings]
  );

  const [currentEntityName, setCurrentEntityName] = useState<string | null>(null);

  // Honour the per-entity-type enablement switch from "Manage entity
  // types" (Streams app). When the resolved type for `entityName` is
  // disabled, the click silently no-ops — both for the initial click
  // from the FakeLogRow and for subsequent Dependencies-row clicks
  // inside an already-open flyout. The FakeLogRow already short-circuits
  // its own click, but Dependencies clicks come through here so this is
  // the canonical gate.
  const openEntity = useCallback((entityName: string) => {
    const entityTypeId = resolveEntityTypeIdForName(entityName);
    if (!isEntityTypeEnabled(entityTypeId)) return;
    setCurrentEntityName(entityName);
  }, []);

  const closeEntity = useCallback(() => {
    setCurrentEntityName(null);
  }, []);

  const value = useMemo<EntityCentricLabContextValue>(
    () => ({ enabled, currentEntityName, openEntity, closeEntity }),
    [enabled, currentEntityName, openEntity, closeEntity]
  );

  const flyoutServices = useMemo(
    () => ({ agentBuilder, notifications, charts }),
    [agentBuilder, notifications, charts]
  );

  return (
    <EntityCentricLabContext.Provider value={value}>
      {children}
      {enabled && currentEntityName !== null ? (
        <EntityFlyoutServicesProvider services={flyoutServices}>
          <EntityFlyout
            entityName={currentEntityName}
            onClose={closeEntity}
            onSelectEntity={openEntity}
          />
        </EntityFlyoutServicesProvider>
      ) : null}
    </EntityCentricLabContext.Provider>
  );
};

export const useEntityCentricLab = (): EntityCentricLabContextValue => {
  const ctx = useContext(EntityCentricLabContext);
  if (!ctx) {
    return {
      enabled: false,
      currentEntityName: null,
      openEntity: () => undefined,
      closeEntity: () => undefined,
    };
  }
  return ctx;
};
