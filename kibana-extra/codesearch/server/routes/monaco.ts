/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from '../kibana_types';

import Path from 'path';

export function monacoRoute(server: Server) {
  server.route({
    method: 'GET',
    path: '/monaco/{param*}',
    handler: {
      directory: {
        path: Path.join(__dirname, '../../node_modules/monaco-editor/min'),
      },
    },
  });
}
