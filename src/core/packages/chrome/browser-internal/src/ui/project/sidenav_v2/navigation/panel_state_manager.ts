/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const STORAGE_KEY = 'core.chrome.sidenav_v2.panel_state';

/**
 * Manages the last active item state for navigation panel openers.
 * Provides persistence across browser sessions using sessionStorage.
 */
export class PanelStateManager {
  private cache: Record<string, string> = {};
  private isStorageAvailable: boolean;

  constructor() {
    this.isStorageAvailable = this.checkStorageAvailability();
    this.loadFromStorage();
  }

  /**
   * Gets the last active item ID for a panel opener.
   * @param panelId - The panel opener node ID
   * @returns The last active item ID, or undefined if not found
   */
  getPanelLastActive(panelId: string): string | undefined {
    return this.cache[panelId];
  }

  /**
   * Sets the last active item for a panel opener.
   * @param panelId - The panel opener node ID
   * @param itemId - The active item ID
   */
  setPanelLastActive(panelId: string, itemId: string): void {
    this.cache[panelId] = itemId;
    this.saveToStorage();
  }

  /**
   * Clears all panel state.
   */
  clearPanelState(): void {
    this.cache = {};
    this.removeFromStorage();
  }

  /**
   * Clears state for a specific panel.
   * @param panelId - The panel opener node ID
   */
  clearPanelLastActive(panelId: string): void {
    delete this.cache[panelId];
    this.saveToStorage();
  }

  private checkStorageAvailability(): boolean {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        return false;
      }
      // Test if we can actually use sessionStorage
      const testKey = '__kibana_storage_test__';
      window.sessionStorage.setItem(testKey, 'test');
      window.sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private loadFromStorage(): void {
    if (!this.isStorageAvailable) return;

    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
      }
    } catch {
      // Ignore parsing errors, start with empty cache
      this.cache = {};
    }
  }

  private saveToStorage(): void {
    if (!this.isStorageAvailable) return;

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }

  private removeFromStorage(): void {
    if (!this.isStorageAvailable) return;

    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore removal errors
    }
  }
}

// Export singleton instance for convenience
export const panelStateManager = new PanelStateManager();
