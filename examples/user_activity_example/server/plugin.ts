/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import { registerRoutes } from './routes';

export class UserActivityExamplePlugin implements Plugin<{}, {}> {
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    registerRoutes(router, core);
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
