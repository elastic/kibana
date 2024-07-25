/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SharedUXRouterService } from '@kbn/shared-ux-router/services';

export interface SharedUXRouterServices {
  services: SharedUXRouterService;
}

export interface KibanaSharedUXRouterProviderDeps {
  http: {
    executionContext: {
      context$: Observable<KibanaExecutionContext>;
      set(c$: KibanaExecutionContext): void;
      get(): KibanaExecutionContext;
      clear(): void;
    };
  };
}
