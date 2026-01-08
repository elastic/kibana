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
import type { EmbeddableEditorState } from '@kbn/embeddable-plugin/public';
import {
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
  type InternalStateStore,
  type RuntimeStateManager,
} from '../redux';
import { createTabsStorageManager } from '../tabs_storage_manager';
import type { DiscoverCustomizationContext } from '../../../../customizations';
import type { DiscoverServices } from '../../../../build_services';
import { DiscoverSearchSessionManager } from '../discover_search_session';
import { useEmbeddedState } from '../../hooks/use_embedded_state';

interface UseStateManagers {
  customizationContext: DiscoverCustomizationContext;
  services: DiscoverServices;
  urlStateStorage: IKbnUrlStateStorage;
}

interface UseStateManagersReturn {
  internalState: InternalStateStore;
  runtimeStateManager: RuntimeStateManager;
  searchSessionManager: DiscoverSearchSessionManager;
  embeddableState: EmbeddableEditorState | undefined;
  isEmbeddableEditor: () => boolean;
}

export const useStateManagers = ({
  services,
  urlStateStorage,
  customizationContext,
}: UseStateManagers): UseStateManagersReturn => {
  const { isEmbeddableEditor, embeddableState } = useEmbeddedState();

  const tabsEnabled = !isEmbeddableEditor() && services.discoverFeatureFlags.getTabsEnabled();

  // syncing with the _tab part URL
  const [tabsStorageManager] = useState(() =>
    createTabsStorageManager({
      urlStateStorage,
      storage: services.storage,
      enabled: tabsEnabled,
    })
  );

  const [runtimeStateManager] = useState(() => createRuntimeStateManager());
  const [searchSessionManager] = useState(() => {
    return new DiscoverSearchSessionManager({
      history: services.history,
      session: services.data.search.session,
    });
  });
  const [internalState] = useState(() =>
    createInternalStateStore({
      services,
      customizationContext,
      runtimeStateManager,
      urlStateStorage,
      tabsStorageManager,
      searchSessionManager,
    })
  );

  useEffect(() => {
    const stopUrlSync = tabsStorageManager.startUrlSync({
      // if `_tab` in URL changes (for example via browser history), try to restore the previous state
      onChanged: (urlState) => {
        const { tabId: restoreTabId } = urlState;
        if (restoreTabId) {
          internalState.dispatch(internalStateActions.restoreTab({ restoreTabId }));
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
      searchSessionManager,
      isEmbeddableEditor,
      embeddableState,
    }),
    [internalState, runtimeStateManager, searchSessionManager, isEmbeddableEditor, embeddableState]
  );
};
