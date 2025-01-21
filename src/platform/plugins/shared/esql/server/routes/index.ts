/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, PluginInitializerContext } from '@kbn/core/server';

import { registerGetJoinIndicesRoute } from './get_join_indices';

export const registerRoutes = (setup: CoreSetup, initContext: PluginInitializerContext) => {
  const router = setup.http.createRouter();

  registerGetJoinIndicesRoute(router, initContext);
};
