/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, Logger } from 'kibana/server';

import { shortUrlLookupProvider } from './lib/short_url_lookup';
import { createGotoRoute } from './goto';
import { createShortenUrlRoute } from './shorten_url';
import { createGetterRoute } from './get';

export function createRoutes({ http }: CoreSetup, logger: Logger) {
  const shortUrlLookup = shortUrlLookupProvider({ logger });
  const router = http.createRouter();

  createGotoRoute({ router, shortUrlLookup, http });
  createGetterRoute({ router, shortUrlLookup, http });
  createShortenUrlRoute({ router, shortUrlLookup });
}
