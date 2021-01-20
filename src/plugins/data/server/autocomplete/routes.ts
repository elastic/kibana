/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { CoreSetup, SharedGlobalConfig } from 'kibana/server';
import { registerValueSuggestionsRoute } from './value_suggestions_route';

export function registerRoutes({ http }: CoreSetup, config$: Observable<SharedGlobalConfig>): void {
  const router = http.createRouter();

  registerValueSuggestionsRoute(router, config$);
}
