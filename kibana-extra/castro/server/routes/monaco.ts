/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Hapi from 'hapi';

import Path from 'path';

export default function(server: Hapi.Server) {
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
