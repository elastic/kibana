/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

const SETTINGS_STORAGE_KEY = 'kbn_developer_toolbar_settings';

export interface DeveloperToolbarItem {
  id: string;
  name?: string;
  children: ReactNode;
  priority: number;
}

export interface ToolbarSettings {
  environmentEnabled: boolean;
  frameJankEnabled: boolean;
  memoryUsageEnabled: boolean;
  consoleErrorsEnabled: boolean;
  disabledItemIds: string[];
  customEnvironmentLabel: string;
  customBackgroundColor: string;
}

const DEFAULT_SETTINGS: ToolbarSettings = {
  environmentEnabled: true,
  frameJankEnabled: true,
  memoryUsageEnabled: true,
  consoleErrorsEnabled: true,
  disabledItemIds: [],
  customEnvironmentLabel: '',
  customBackgroundColor: '',
};

export class ToolbarStateManager {
  private items: DeveloperToolbarItem[] = [];
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

  registerItem(item: DeveloperToolbarItem): () => void {
    const exists = this.items.some((i) => i.id === item.id);
    if (exists) {
      return () => {}; // Return no-op if already exists
    }

    this.items = [...this.items, item].sort((a, b) => b.priority - a.priority);
    this.notifySubscribers();

    return () => {
      this.items = this.items.filter((i) => i.id !== item.id);
      this.notifySubscribers();
    };
  }

  getItems(): DeveloperToolbarItem[] {
    return this.items;
  }

  getEnabledItems(): DeveloperToolbarItem[] {
    return this.items.filter((item) => !this.settings.disabledItemIds.includes(item.id));
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
      key === 'disabledItemIds' ||
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

  toggleItemEnabled(itemId: string): void {
    const isCurrentlyDisabled = this.settings.disabledItemIds.includes(itemId);
    const newDisabledIds = isCurrentlyDisabled
      ? this.settings.disabledItemIds.filter((id) => id !== itemId)
      : [...this.settings.disabledItemIds, itemId];
    this.updateSettings({ disabledItemIds: newDisabledIds });
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
