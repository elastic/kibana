/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import Chalk from 'chalk';
import moment from 'moment';

import { createDevServer, type DevServer } from '@kbn/vite-optimizer';

/**
 * Vite server phases (simplified compared to webpack optimizer)
 */
export type ViteServerPhase = 'starting' | 'ready' | 'error';

export interface ViteServerOptions {
  /**
   * Whether the Vite server is enabled
   */
  enabled: boolean;

  /**
   * Root directory of the Kibana repository
   */
  repoRoot: string;

  /**
   * Port for the Vite dev server
   */
  port?: number;

  /**
   * Port for HMR websocket
   */
  hmrPort?: number;

  /**
   * Include example plugins
   */
  runExamples?: boolean;

  /**
   * Plugin IDs to include (empty = all)
   */
  pluginFilter?: string[];

  /**
   * Whether to log verbose output
   */
  verbose?: boolean;

  /**
   * Whether to suppress output
   */
  silent?: boolean;
}

/**
 * ViteServer coordinates the Vite dev server for Kibana development.
 *
 * This is a simpler alternative to the webpack-based Optimizer class.
 * It starts a Vite dev server that serves plugin bundles with HMR.
 */
export class ViteServer {
  public readonly run$: Rx.Observable<void>;
  private readonly ready$ = new Rx.BehaviorSubject<boolean>(false);
  private readonly phase$ = new Rx.BehaviorSubject<ViteServerPhase>('starting');
  private devServer?: DevServer;

  /**
   * The URL of the Vite dev server
   */
  public serverUrl?: string;

  /**
   * Plugin IDs being served by Vite
   */
  public pluginIds: string[] = [];

  constructor(options: ViteServerOptions) {
    if (!options.enabled) {
      this.run$ = Rx.EMPTY;
      this.ready$.next(true);
      this.phase$.next('ready');
      return;
    }

    const name = Chalk.magentaBright('@kbn/vite');
    const time = () => moment().format('HH:mm:ss.SSS');

    const log = (type: string, message: string) => {
      if (options.silent) return;
      const level = type === 'error' ? Chalk.red(type) : Chalk.green(type);
      // eslint-disable-next-line no-console
      console.log(` np bld    log   [${time()}] [${level}][${name}] ${message}`);
    };

    this.run$ = new Rx.Observable<void>((subscriber) => {
      const start = async () => {
        try {
          log('info', 'Starting Vite dev server...');
          this.phase$.next('starting');

          this.devServer = await createDevServer({
            repoRoot: options.repoRoot,
            port: options.port || 5173,
            hmrPort: options.hmrPort || 5174,
            examples: options.runExamples,
            pluginFilter: options.pluginFilter,
            logLevel: options.verbose ? 'info' : options.silent ? 'silent' : 'warn',
          });

          this.serverUrl = this.devServer.getUrl();
          this.pluginIds = this.devServer.pluginIds;

          log('info', `Vite dev server ready at ${this.serverUrl}`);
          log('info', `Serving ${this.pluginIds.length} plugins with HMR`);

          this.phase$.next('ready');
          this.ready$.next(true);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          log('error', `Failed to start Vite dev server: ${errMsg}`);
          this.phase$.next('error');
          this.ready$.next(false);
          subscriber.error(error);
        }
      };

      start();

      // Cleanup on unsubscribe
      return () => {
        if (this.devServer) {
          log('info', 'Stopping Vite dev server...');
          this.devServer.close().catch((err: Error) => {
            log('error', `Error closing Vite server: ${err.message}`);
          });
          this.devServer = undefined;
        }
        this.phase$.complete();
        this.ready$.complete();
      };
    });
  }

  /**
   * Observable that emits the current phase
   */
  getPhase$(): Rx.Observable<ViteServerPhase> {
    return this.phase$.asObservable();
  }

  /**
   * Observable that emits when the server is ready
   */
  isReady$(): Rx.Observable<boolean> {
    return this.ready$.asObservable();
  }

  /**
   * Check if the server is currently ready
   */
  isReady(): boolean {
    return this.ready$.getValue();
  }

  /**
   * Get the Vite server URL (for proxy configuration)
   */
  getServerUrl(): string | undefined {
    return this.serverUrl;
  }

  /**
   * Get the list of plugin IDs being served
   */
  getPluginIds(): string[] {
    return this.pluginIds;
  }

  /**
   * Get the import map for ESM loading
   */
  getImportMap(): Record<string, string> {
    if (!this.devServer) {
      return {};
    }
    return this.devServer.getImportMap();
  }
}
