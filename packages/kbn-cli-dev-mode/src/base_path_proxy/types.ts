/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

export interface BasePathProxyServer {
  readonly basePath: string | undefined;
  readonly targetPort: number;
  readonly host: string;
  readonly port: number;

  start(options: BasePathProxyServerOptions): Promise<void>;
  stop(): Promise<void>;
}

export interface BasePathProxyServerOptions {
  shouldRedirectFromOldBasePath: (path: string) => boolean;
  delayUntil: () => Observable<void>;
  /**
   * When set, asset requests (bundles, Vite internals, static assets) are
   * proxied directly to the Vite dev server on this port, bypassing the
   * Kibana server. This allows the browser to start loading assets while
   * the Kibana server is still booting.
   */
  viteDevServerPort?: number;
  /**
   * Like delayUntil, but only waits for the Vite dev server to be ready.
   * Used for asset requests routed directly to Vite.
   */
  delayUntilForAssets?: () => Observable<void>;
  /**
   * Returns true when the Kibana server is ready to accept requests.
   */
  isServerReady?: () => boolean;
  /**
   * Returns the plugin IDs being served by the Vite dev server, or
   * undefined if the Vite server isn't ready yet. Used to generate the
   * pre-loading shell HTML.
   */
  getVitePluginIds?: () => string[] | undefined;
}
