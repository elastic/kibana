/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from '../kibana_types';
import { ServerOptions } from '../server_options';

export function userRoute(server: Server, serverOptions: ServerOptions) {
  server.route({
    path: '/api/cs/user/config',
    method: 'GET',
    async handler(req, reply) {
      reply({
        isAdmin: serverOptions.isAdmin,
      });
    },
  });
}
