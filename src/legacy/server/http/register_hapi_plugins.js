/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import HapiTemplates from '@hapi/vision';
import HapiStaticFiles from '@hapi/inert';
import HapiProxy from '@hapi/h2o2';

const plugins = [HapiTemplates, HapiStaticFiles, HapiProxy];

async function registerPlugins(server) {
  return await server.register(plugins);
}

export function registerHapiPlugins(server) {
  registerPlugins(server);
}
