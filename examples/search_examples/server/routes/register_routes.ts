/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IRouter } from 'kibana/server';
import { PluginStart as DataPluginStart } from 'src/plugins/data/server';
import { registerServerSearchRoute } from './server_search_route';

export function registerRoutes(router: IRouter, data: DataPluginStart) {
  registerServerSearchRoute(router, data);
}
