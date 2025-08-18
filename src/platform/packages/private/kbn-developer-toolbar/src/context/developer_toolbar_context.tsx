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
import type { DeveloperToolbarActionItem } from '../types/actions';

const SETTINGS_STORAGE_KEY = 'kbn_developer_toolbar_settings';

export interface ToolbarSettings {
  environmentEnabled: boolean;
  frameJankEnabled: boolean;
  memoryUsageEnabled: boolean;
  consoleErrorsEnabled: boolean;
  disabledActionIds: string[];
  customEnvironmentLabel: string;
  customBackgroundColor: string;
}

const DEFAULT_SETTINGS: ToolbarSettings = {
  environmentEnabled: true,
  frameJankEnabled: true,
  memoryUsageEnabled: true,
  consoleErrorsEnabled: true,
  disabledActionIds: [],
  customEnvironmentLabel: '',
  customBackgroundColor: '',
};

export interface DeveloperToolbarContextValue {
  actions: DeveloperToolbarActionItem[];
  enabledActions: DeveloperToolbarActionItem[];
  settings: ToolbarSettings;
  registerAction: (action: DeveloperToolbarActionItem) => () => void;
  toggleSetting: (key: keyof ToolbarSettings) => void;
  toggleActionEnabled: (actionId: string) => void;
  updateCustomEnvironmentLabel: (label: string) => void;
  updateCustomBackgroundColor: (color: string | undefined) => void;
}

/**
 * Enhanced global state manager for actions and settings
 * @internal
 */
class GlobalStateManager {
  private actions: DeveloperToolbarActionItem[] = [];
  private settings: ToolbarSettings;
  private subscribers: Set<() => void> = new Set();

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): ToolbarSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }

  registerAction(action: DeveloperToolbarActionItem): () => void {
    const exists = this.actions.some((a) => a.id === action.id);
    if (exists) {
      return () => {}; // Return no-op if already exists
    }

    this.actions = [...this.actions, action].sort((a, b) => b.priority - a.priority);
    this.notifySubscribers();

    return () => {
      this.actions = this.actions.filter((a) => a.id !== action.id);
      this.notifySubscribers();
    };
  }

  getActions(): DeveloperToolbarActionItem[] {
    return this.actions;
  }

  getEnabledActions(): DeveloperToolbarActionItem[] {
    return this.actions.filter((action) => !this.settings.disabledActionIds.includes(action.id));
  }

  getSettings(): ToolbarSettings {
    return this.settings;
  }

  updateSettings(newSettings: Partial<ToolbarSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.notifySubscribers();
  }

  toggleSetting(key: keyof ToolbarSettings): void {
    if (
      key === 'disabledActionIds' ||
      key === 'customEnvironmentLabel' ||
      key === 'customBackgroundColor'
    )
      return; // Prevent direct manipulation
    const currentValue = this.settings[key];
    if (typeof currentValue === 'boolean') {
      this.updateSettings({ [key]: !currentValue });
    }
  }

  updateCustomEnvironmentLabel(label: string): void {
    this.updateSettings({ customEnvironmentLabel: label });
  }

  updateCustomBackgroundColor(color: string | undefined): void {
    this.updateSettings({ customBackgroundColor: color });
  }

  toggleActionEnabled(actionId: string): void {
    const isCurrentlyDisabled = this.settings.disabledActionIds.includes(actionId);
    const newDisabledIds = isCurrentlyDisabled
      ? this.settings.disabledActionIds.filter((id) => id !== actionId)
      : [...this.settings.disabledActionIds, actionId];
    this.updateSettings({ disabledActionIds: newDisabledIds });
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }
}

/**
 * Global registry for ensuring single context instance across bundles
 * @internal
 */
const REGISTRY_KEY = '__KIBANA_DEVELOPER_TOOLBAR_CTX__';

interface DeveloperToolbarRegistry {
  DeveloperToolbarContext?: React.Context<DeveloperToolbarContextValue | null>;
  globalStateManager?: GlobalStateManager;
}

const getGlobalRegistry = (): DeveloperToolbarRegistry => {
  if (typeof globalThis === 'undefined') {
    // Fallback for environments without globalThis
    return {};
  }
  return ((globalThis as any)[REGISTRY_KEY] ??= {} as DeveloperToolbarRegistry);
};

const registry = getGlobalRegistry();

// Reuse if already created, otherwise create and store
export const DeveloperToolbarContext = (registry.DeveloperToolbarContext ??=
  createContext<DeveloperToolbarContextValue | null>(null));

// Reuse global state manager or create new one
const getGlobalStateManager = (): GlobalStateManager => {
  return (registry.globalStateManager ??= new GlobalStateManager());
};

export interface DeveloperToolbarProviderProps {
  children: ReactNode;
}

export const DeveloperToolbarProvider: React.FC<DeveloperToolbarProviderProps> = ({ children }) => {
  const globalStateManager = getGlobalStateManager();
  const [state, setState] = useState(() => ({
    actions: globalStateManager.getActions(),
    enabledActions: globalStateManager.getEnabledActions(),
    settings: globalStateManager.getSettings(),
  }));

  useEffect(() => {
    return globalStateManager.subscribe(() => {
      setState({
        actions: globalStateManager.getActions(),
        enabledActions: globalStateManager.getEnabledActions(),
        settings: globalStateManager.getSettings(),
      });
    });
  }, [globalStateManager]);

  const registerAction = useCallback(
    (action: DeveloperToolbarActionItem) => {
      return globalStateManager.registerAction(action);
    },
    [globalStateManager]
  );

  const toggleSetting = useCallback(
    (key: keyof ToolbarSettings) => {
      globalStateManager.toggleSetting(key);
    },
    [globalStateManager]
  );

  const toggleActionEnabled = useCallback(
    (actionId: string) => {
      globalStateManager.toggleActionEnabled(actionId);
    },
    [globalStateManager]
  );

  const updateCustomEnvironmentLabel = useCallback(
    (label: string) => {
      globalStateManager.updateCustomEnvironmentLabel(label);
    },
    [globalStateManager]
  );

  const updateCustomBackgroundColor = useCallback(
    (color: string | undefined) => {
      globalStateManager.updateCustomBackgroundColor(color);
    },
    [globalStateManager]
  );

  const value: DeveloperToolbarContextValue = {
    actions: state.actions,
    enabledActions: state.enabledActions,
    settings: state.settings,
    registerAction,
    toggleSetting,
    toggleActionEnabled,
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
