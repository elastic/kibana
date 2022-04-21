/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { CoreSetup } from '@kbn/core/server';
import { registerValueSuggestionsRoute } from './value_suggestions_route';
import { ConfigSchema } from '../../config';

export function registerRoutes({ http }: CoreSetup, config$: Observable<ConfigSchema>): void {
  const router = http.createRouter();

  registerValueSuggestionsRoute(router, config$);
}
