/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { EntitySimulationFlyout } from './entity_simulation_flyout';
import { buildMockEntitySimulation } from './mock_entity_simulation_data';

export interface EntityFlyoutSimulationContextValue {
  openEntityFlyout: (entityName: string) => void;
}

const EntityFlyoutSimulationContext = createContext<EntityFlyoutSimulationContextValue | null>(
  null
);

export function EntityFlyoutSimulationProvider({ children }: { children: React.ReactNode }) {
  const [entityName, setEntityName] = useState<string | null>(null);

  const openEntityFlyout = useCallback((name: string) => {
    setEntityName(name);
  }, []);

  const onClose = useCallback(() => {
    setEntityName(null);
  }, []);

  const entity = useMemo(
    () => (entityName !== null ? buildMockEntitySimulation(entityName) : null),
    [entityName]
  );

  const value = useMemo(() => ({ openEntityFlyout }), [openEntityFlyout]);

  return (
    <EntityFlyoutSimulationContext.Provider value={value}>
      {children}
      {entity ? <EntitySimulationFlyout entity={entity} onClose={onClose} /> : null}
    </EntityFlyoutSimulationContext.Provider>
  );
}

export function useEntityFlyoutSimulation(): EntityFlyoutSimulationContextValue | null {
  return useContext(EntityFlyoutSimulationContext);
}
