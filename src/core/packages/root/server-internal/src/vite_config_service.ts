/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Observable, filter, take, timeout, catchError, of } from 'rxjs';

/**
 * Configuration received from the Vite dev server
 */
export interface ViteConfig {
  /**
   * URL of the Vite dev server
   */
  serverUrl: string;

  /**
   * List of plugin IDs being served by Vite
   */
  pluginIds: string[];
}

/**
 * Singleton service that holds Vite configuration received via IPC from the parent process.
 *
 * This service is used to coordinate between the cli-dev-mode parent process
 * (which runs the Vite dev server) and the Kibana server child process
 * (which needs to know which plugins to proxy to Vite).
 */
export class ViteConfigService {
  private static instance: ViteConfigService | undefined;

  private readonly config$ = new BehaviorSubject<ViteConfig | null>(null);

  private constructor() {}

  /**
   * Get the singleton instance of ViteConfigService
   */
  public static getInstance(): ViteConfigService {
    if (!ViteConfigService.instance) {
      ViteConfigService.instance = new ViteConfigService();
    }
    return ViteConfigService.instance;
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  public static reset(): void {
    ViteConfigService.instance = undefined;
  }

  /**
   * Set the Vite configuration (called when IPC message is received)
   */
  public setConfig(config: ViteConfig): void {
    // eslint-disable-next-line no-console
    console.log(
      `[vite] Received Vite config: ${config.pluginIds.length} plugins from ${config.serverUrl}`
    );
    // eslint-disable-next-line no-console
    console.log(`[vite] Sample plugin IDs: ${config.pluginIds.slice(0, 10).join(', ')}...`);
    this.config$.next(config);
  }

  /**
   * Get the current Vite configuration (may be null if not yet received)
   */
  public getConfig(): ViteConfig | null {
    return this.config$.getValue();
  }

  /**
   * Get an observable that emits the Vite configuration
   */
  public getConfig$(): Observable<ViteConfig | null> {
    return this.config$.asObservable();
  }

  /**
   * Wait for Vite configuration with a timeout
   *
   * @param timeoutMs Maximum time to wait for config (default: 10000ms)
   * @returns Observable that emits the config or null on timeout
   */
  public waitForConfig$(timeoutMs = 10000): Observable<ViteConfig | null> {
    return this.config$.pipe(
      filter((config): config is ViteConfig => config !== null),
      take(1),
      timeout(timeoutMs),
      catchError(() => {
        // eslint-disable-next-line no-console
        console.log(`[vite] Timeout waiting for Vite config after ${timeoutMs}ms`);
        return of(null);
      })
    );
  }

  /**
   * Check if a plugin is being served by Vite
   */
  public isPluginServedByVite(pluginId: string): boolean {
    const config = this.config$.getValue();
    return config !== null && config.pluginIds.includes(pluginId);
  }
}
