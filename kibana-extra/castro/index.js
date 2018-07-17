/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import exampleRoute from './server/routes/example';
import lspRoute from './server/routes/lsp';
import repositoryRoute from './server/routes/repository';
import fileRoute from './server/routes/file';
import manacoRoute from './server/routes/monaco';
import { resolve } from 'path';
import mappings from './mappings';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'castro',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'Castro',
        description: 'castro',
        main: 'plugins/castro/app',
      },

      hacks: [
        'plugins/castro/hack'
      ],

      mappings
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        dataPath: Joi.string().default('/tmp')
      }).default();
    },

    init(server, options) {
      // Add server routes and initialize the plugin here
      exampleRoute(server);
      lspRoute(server);
      repositoryRoute(server);
      fileRoute(server);
      manacoRoute(server);
    },

  });
};
