/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import type { DeveloperToolbarItem, ItemId } from '../state/developer_toolbar_state';
import { ToolbarStateManager } from '../state/developer_toolbar_state';

/**
 * Global registry for ensuring single context instance across bundles
 *
 * TODO: this pattern is used to share a single context provider across bundles loaded from different plugins to allow for smoother DX
 * https://github.com/elastic/kibana/issues/240770
 * @internal
 */
const REGISTRY_KEY = '__KIBANA_DEVELOPER_TOOLBAR_CTX__';

interface DeveloperToolbarRegistry {
  developerToolbarStateManager?: ToolbarStateManager;
}

const getGlobalRegistry = (): DeveloperToolbarRegistry => {
  if (typeof globalThis === 'undefined') {
    // Fallback for environments without globalThis
    return {};
  }
  return ((globalThis as any)[REGISTRY_KEY] ??= {} as DeveloperToolbarRegistry);
};

const registry = getGlobalRegistry();

// Reuse global state manager or create new one
const getOrCreateGlobalStateManager = (): ToolbarStateManager => {
  return (registry.developerToolbarStateManager ??= new ToolbarStateManager());
};

export interface DeveloperToolbarState {
  items: DeveloperToolbarItem[];
  enabledItems: DeveloperToolbarItem[];
  registerItem: (item: DeveloperToolbarItem) => () => void;
  toggleItemEnabled: (itemId: ItemId) => void;
  isEnabled: (itemId: ItemId) => boolean;
}

/**
 * Hook to access the global toolbar state manager
 */
export const useToolbarState = (): DeveloperToolbarState => {
  const developerToolbarStateManager = getOrCreateGlobalStateManager();
  const [state, setState] = useState(() => ({
    enabledItems: developerToolbarStateManager.getEnabledItems(),
    items: developerToolbarStateManager.getItems(),
  }));

  useEffect(() => {
    return developerToolbarStateManager.subscribe(() => {
      setState({
        enabledItems: developerToolbarStateManager.getEnabledItems(),
        items: developerToolbarStateManager.getItems(),
      });
    });
  }, [developerToolbarStateManager]);

  const registerItem = useCallback(
    (item: DeveloperToolbarItem) => {
      return developerToolbarStateManager.registerItem(item);
    },
    [developerToolbarStateManager]
  );

  const toggleItemEnabled = useCallback(
    (itemId: ItemId) => {
      developerToolbarStateManager.toggleItemEnabled(itemId);
    },
    [developerToolbarStateManager]
  );

  const isEnabled = useCallback(
    (itemId: ItemId) => {
      return developerToolbarStateManager.isEnabled(itemId);
    },
    [developerToolbarStateManager]
  );

  const result: DeveloperToolbarState = {
    enabledItems: state.enabledItems,
    items: state.items,
    registerItem,
    toggleItemEnabled,
    isEnabled,
  };

  return result;
};
