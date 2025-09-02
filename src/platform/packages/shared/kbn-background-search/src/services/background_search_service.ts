/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { SearchSessionState } from '@kbn/data-plugin/public';

interface BackgroundSearchCtx {
  enabled: boolean;
  state$: Observable<SearchSessionState>;
}

let ctx: BackgroundSearchCtx | undefined;

export function getBackgroundSearchState$(): Observable<SearchSessionState> | undefined {
  return ctx?.state$;
}

export function initBackgroundSearch(params: BackgroundSearchCtx) {
  ctx = params;
}

export function isBackgroundSearchEnabled(): boolean {
  return Boolean(ctx?.enabled);
}
