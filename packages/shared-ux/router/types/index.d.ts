/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SharedUXRouterService } from '@kbn/shared-ux-router/services';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

export interface SharedUXRouterServices {
  services: SharedUXRouterService;
}

// packages/core/execution-context/core-execution-context-browser/src/types.ts
export interface KibanaSharedUXRouterProviderDeps {
  context$: Observable<KibanaExecutionContext>;
  set(c$: KibanaExecutionContext): void;
  get(): KibanaExecutionContext;
  clear(): void;
}
