/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import { withActiveSpan } from '@kbn/tracing-utils';
import { registerRoutes } from './routes/register_routes';

export class OtelWorkshopPlugin implements Plugin<{}, {}> {
  public setup(core: CoreSetup) {
    withActiveSpan('open_coffee_shop', { root: true }, (span) => {
      span?.setAttribute('coffeeshop.name', 'The Open Coffee Shop');
      const router = core.http.createRouter();
      registerRoutes(router);
    });
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
