/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, IRouter, Logger } from 'kibana/server';

import { shortUrlLookupProvider } from './lib/short_url_lookup';
import { createGotoRoute } from './goto';
import { createShortenUrlRoute } from './shorten_url';

export function createRoutes({ http }: CoreSetup, router: IRouter, logger: Logger) {
  const shortUrlLookup = shortUrlLookupProvider({ logger });

  createGotoRoute({ router, shortUrlLookup, http });
  createShortenUrlRoute({ router, shortUrlLookup });
}
