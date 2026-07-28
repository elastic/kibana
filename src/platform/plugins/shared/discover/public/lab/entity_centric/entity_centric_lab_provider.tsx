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
import useObservable from 'react-use/lib/useObservable';
import {
  EntityFlyout,
  EntityFlyoutServicesProvider,
  isEntityTypeEnabled,
  resolveEntityTypeIdForName,
} from '@kbn/entity-centric-lab-flyout';
import type { EntitySelectionContext } from '@kbn/entity-centric-lab-flyout';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { LabMode } from './constants';
import { LAB_MODE_SETTING } from './constants';

interface EntityCentricLabContextValue {
  readonly enabled: boolean;
  readonly currentEntityName: string | null;
  readonly openEntity: (entityName: string) => void;
  readonly closeEntity: () => void;
}

const EntityCentricLabContext = createContext<EntityCentricLabContextValue | null>(null);

export const EntityCentricLabProvider = ({ children }: PropsWithChildren<{}>) => {
  const { uiSettings, agentBuilder, notifications, charts, application } = useDiscoverServices();
  // Space-scoped advanced setting; lives in Stack Management → Advanced Settings
  // under the Discover category. We subscribe to it live (rather than reading
  // once) so flipping the mode takes effect on re-render without depending on a
  // full page reload — a `useMemo(..., [uiSettings])` read is computed only at
  // mount, which left the panel stale after switching modes. Only the
  // `entityCentric` mode drives Discover's customization; `off` and
  // `infraShortTerm` both leave Discover untouched.
  const labMode = useObservable(
    uiSettings.get$<LabMode>(LAB_MODE_SETTING, 'off'),
    uiSettings.get<LabMode>(LAB_MODE_SETTING, 'off')
  );
  const enabled = labMode === 'entityCentric';

  // Two flyout slots so the shared flyout's parent/child session can dock
  // two entities side by side: `currentEntityName` is the parent (session
  // `'start'`), `childEntityName` is the child (session `'inherit'`). The ref
  // mirrors the parent so the stable `openEntity` callback can decide,
  // without re-creating on every selection change, whether a click opens the
  // parent (nothing open yet) or a child (parent already open).
  const [currentEntityName, setCurrentEntityName] = useState<string | null>(null);
  const [childEntityName, setChildEntityName] = useState<string | null>(null);
  // The child slot also tracks the health/type it was opened with so the
  // child flyout renders coherent with what the parent's Dependencies
  // table / topology map showed for that entity (rather than defaulting to
  // the healthy template).
  const [childEntityContext, setChildEntityContext] = useState<EntitySelectionContext | null>(null);

  // Honour the per-entity-type enablement switch from "Manage entity
  // types" (Streams app). When the resolved type is disabled, opening is
  // silently declined.
  const isEntityOpenable = useCallback((entityName: string) => {
    const entityTypeId = resolveEntityTypeIdForName(entityName);
    return isEntityTypeEnabled(entityTypeId);
  }, []);

  // Page-surface selection (a log-line click) and the parent flyout's own
  // history navigation both *replace* the single open flyout — there's no
  // parent/child relationship there. Child flyouts are opened only from
  // *inside* a flyout via {@link openChildEntity}.
  const openEntity = useCallback(
    (entityName: string) => {
      if (!isEntityOpenable(entityName)) return;
      setCurrentEntityName(entityName);
      setChildEntityName(null);
      setChildEntityContext(null);
    },
    [isEntityOpenable]
  );

  // Selecting from *inside* a flyout always targets the child slot, so the
  // parent stays pinned and the child opens or navigates to the new entity.
  const openChildEntity = useCallback(
    (entityName: string, context?: EntitySelectionContext) => {
      if (!isEntityOpenable(entityName)) return;
      setChildEntityName(entityName);
      setChildEntityContext(context ?? null);
    },
    [isEntityOpenable]
  );

  // Closing the parent tears the whole session down (a child can't outlive
  // its parent); closing the child leaves the parent open.
  const closeEntity = useCallback(() => {
    setCurrentEntityName(null);
    setChildEntityName(null);
    setChildEntityContext(null);
  }, []);
  const closeChildEntity = useCallback(() => {
    setChildEntityName(null);
    setChildEntityContext(null);
  }, []);

  // The gear in the flyout footer deep-links to the "Manage entity types"
  // wizard in the Streams app. We compute the wizard row id from the
  // entity name (plus type when available for the child slot) using the
  // shared resolver, so the wizard auto-opens on the matching row.
  // Falls back to the wizard's landing page when no mapping exists.
  const manageEntityType = useCallback(
    (entityName: string, entityType?: string) => {
      const editId = resolveEntityTypeIdForName(entityName, entityType);
      const path = editId
        ? `/manage-entity-types?edit=${encodeURIComponent(editId)}`
        : '/manage-entity-types';
      application.navigateToApp('streams', { path });
    },
    [application]
  );

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
            session="start"
            size="m"
            entityName={currentEntityName}
            onClose={closeEntity}
            onSelectEntity={openChildEntity}
            onNavigateEntity={openEntity}
            onManageEntityType={() => manageEntityType(currentEntityName)}
          />
          {childEntityName !== null ? (
            <EntityFlyout
              session="inherit"
              size="fill"
              entityName={childEntityName}
              entityType={childEntityContext?.entityType}
              entityHealth={childEntityContext?.health}
              region={childEntityContext?.region}
              onClose={closeChildEntity}
              onSelectEntity={openChildEntity}
              onNavigateEntity={openChildEntity}
              onManageEntityType={() =>
                manageEntityType(childEntityName, childEntityContext?.entityType)
              }
            />
          ) : null}
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
