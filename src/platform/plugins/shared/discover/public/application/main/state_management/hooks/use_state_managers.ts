/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import {
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
  type InternalStateStore,
  type RuntimeStateManager,
} from '../redux';
import { createTabsStorageManager } from '../tabs_storage_manager';
import { TABS_ENABLED } from '../../../../constants';
import type { DiscoverCustomizationContext } from '../../../../customizations';
import type { DiscoverServices } from '../../../../build_services';

interface UseStateManagers {
  customizationContext: DiscoverCustomizationContext;
  services: DiscoverServices;
  urlStateStorage: IKbnUrlStateStorage;
}

interface UseStateManagersReturn {
  internalState: InternalStateStore;
  runtimeStateManager: RuntimeStateManager;
}

export const useStateManagers = ({
  services,
  urlStateStorage,
  customizationContext,
}: UseStateManagers): UseStateManagersReturn => {
  // syncing with the _t part URL
  const [tabsStorageManager] = useState(() =>
    createTabsStorageManager({
      urlStateStorage,
      storage: services.storage,
      enabled: TABS_ENABLED,
    })
  );

  const [runtimeStateManager] = useState(() => createRuntimeStateManager());
  const [internalState] = useState(() =>
    createInternalStateStore({
      services,
      customizationContext,
      runtimeStateManager,
      urlStateStorage,
      tabsStorageManager,
    })
  );

  useEffect(() => {
    const stopUrlSync = tabsStorageManager.startUrlSync({
      // if `_t` in URL changes (for example via browser history), try to restore the previous state
      onChanged: (urlState) => {
        const { tabId: restoreTabId } = urlState;
        if (restoreTabId) {
          internalState.dispatch(internalStateActions.restoreTab({ restoreTabId }));
        } else {
          // if tabId is not present in `_t`, clear all tabs
          internalState.dispatch(internalStateActions.clearAllTabs());
        }
      },
    });
    return () => {
      stopUrlSync();
    };
  }, [tabsStorageManager, internalState]);

  return useMemo(
    () => ({
      internalState,
      runtimeStateManager,
    }),
    [internalState, runtimeStateManager]
  );
};
