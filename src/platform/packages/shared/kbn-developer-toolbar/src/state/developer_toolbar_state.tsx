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
  children: ReactNode;
  priority?: number;
}

export type KnownItemIds = 'environmentInfo' | 'frameJank' | 'memoryMonitor' | 'errorsMonitor';

export type ItemId = KnownItemIds | string;

export interface ToolbarSettings {
  disableItemsIds: ItemId[];
}

const DEFAULT_SETTINGS: ToolbarSettings = {
  disableItemsIds: [],
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

    this.items = [...this.items, item].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.notifySubscribers();

    return () => {
      this.items = this.items.filter((i) => i.id !== item.id);
      this.notifySubscribers();
    };
  }

  isEnabled(itemId: ItemId): boolean {
    return !this.settings.disableItemsIds.includes(itemId);
  }

  getItems(): DeveloperToolbarItem[] {
    return this.items;
  }

  getEnabledItems(): DeveloperToolbarItem[] {
    return this.items.filter((item) => this.isEnabled(item.id));
  }

  getSettings(): ToolbarSettings {
    return this.settings;
  }

  updateSettings(newSettings: Partial<ToolbarSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.notifySubscribers();
  }

  toggleItemEnabled(itemId: ItemId): void {
    const isCurrentlyEnabled = this.isEnabled(itemId);
    const newDisabledIds = isCurrentlyEnabled
      ? [...this.settings.disableItemsIds, itemId]
      : this.settings.disableItemsIds.filter((id) => id !== itemId);

    this.updateSettings({ disableItemsIds: newDisabledIds });
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
