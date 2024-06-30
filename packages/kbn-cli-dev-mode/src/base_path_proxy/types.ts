/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
}
