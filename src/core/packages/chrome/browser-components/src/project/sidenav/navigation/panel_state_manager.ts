/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Manages the last active item state for navigation panel openers.
 * Provides persistence across browser sessions using sessionStorage.
 */
export class PanelStateManager {
  private readonly key: string;
  private state: Record<string, string> = {};

  constructor(private readonly basePath: string = '/') {
    const STORAGE_KEY = 'core.chrome.sidenav_v2.panel_state';
    this.key = `${STORAGE_KEY}:${this.basePath}`;
    this.load();
  }

  getPanelLastActive(panelId: string): string | undefined {
    return this.state[panelId];
  }

  setPanelLastActive(panelId: string, itemId: string): void {
    this.state[panelId] = itemId;
    this.save();
  }

  clear(): void {
    this.state = {};
    try {
      window.sessionStorage.removeItem(this.key);
    } catch {
      // Ignore storage errors
    }
  }

  private load(): void {
    try {
      const stored = window.sessionStorage.getItem(this.key);
      this.state = stored ? JSON.parse(stored) : {};
    } catch {
      // Ignore parsing errors, start with empty cache
      this.state = {};
    }
  }

  private save(): void {
    try {
      window.sessionStorage.setItem(this.key, JSON.stringify(this.state));
    } catch {
      // Ignore storage errors
    }
  }
}
