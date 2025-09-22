/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

import type { DeveloperToolbarItem, ToolbarSettings } from './developer_toolbar_state';
import { ToolbarStateManager } from './developer_toolbar_state';

export interface DeveloperToolbarContextValue {
  items: DeveloperToolbarItem[];
  enabledItems: DeveloperToolbarItem[];
  settings: ToolbarSettings;
  registerItem: (item: DeveloperToolbarItem) => () => void;
  toggleSetting: (key: keyof ToolbarSettings) => void;
  toggleItemEnabled: (itemId: string) => void;
  updateCustomEnvironmentLabel: (label: string) => void;
  updateCustomBackgroundColor: (color: string | undefined) => void;
}

/**
 * Global registry for ensuring single context instance across bundles
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

export const DeveloperToolbarContext = createContext<DeveloperToolbarContextValue | null>(null);

// Reuse global state manager or create new one
const getGlobalStateManager = (): ToolbarStateManager => {
  return (registry.developerToolbarStateManager ??= new ToolbarStateManager());
};

export interface DeveloperToolbarProviderProps {
  children: ReactNode;
}

export const DeveloperToolbarProvider: React.FC<DeveloperToolbarProviderProps> = ({ children }) => {
  const developerToolbarStateManager = getGlobalStateManager();
  const [state, setState] = useState(() => ({
    items: developerToolbarStateManager.getItems(),
    settings: developerToolbarStateManager.getSettings(),
  }));

  useEffect(() => {
    return developerToolbarStateManager.subscribe(() => {
      setState({
        items: developerToolbarStateManager.getItems(),
        settings: developerToolbarStateManager.getSettings(),
      });
    });
  }, [developerToolbarStateManager]);

  const registerItem = useCallback(
    (item: DeveloperToolbarItem) => {
      return developerToolbarStateManager.registerItem(item);
    },
    [developerToolbarStateManager]
  );

  const toggleSetting = useCallback(
    (key: keyof ToolbarSettings) => {
      developerToolbarStateManager.toggleSetting(key);
    },
    [developerToolbarStateManager]
  );

  const toggleItemEnabled = useCallback(
    (itemId: string) => {
      developerToolbarStateManager.toggleItemEnabled(itemId);
    },
    [developerToolbarStateManager]
  );

  const updateCustomEnvironmentLabel = useCallback(
    (label: string) => {
      developerToolbarStateManager.updateCustomEnvironmentLabel(label);
    },
    [developerToolbarStateManager]
  );

  const updateCustomBackgroundColor = useCallback(
    (color: string | undefined) => {
      developerToolbarStateManager.updateCustomBackgroundColor(color);
    },
    [developerToolbarStateManager]
  );

  const value: DeveloperToolbarContextValue = {
    items: state.items,
    enabledItems: developerToolbarStateManager.getEnabledItems(),
    settings: state.settings,
    registerItem,
    toggleSetting,
    toggleItemEnabled,
    updateCustomEnvironmentLabel,
    updateCustomBackgroundColor,
  };

  return (
    <DeveloperToolbarContext.Provider value={value}>{children}</DeveloperToolbarContext.Provider>
  );
};

export const useDeveloperToolbarContext = (): DeveloperToolbarContextValue => {
  const context = useContext(DeveloperToolbarContext);
  if (!context) {
    throw new Error('useDeveloperToolbarContext must be used within a DeveloperToolbarProvider');
  }
  return context;
};
