/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import mappings from './mappings';
import exampleRoute from './server/routes/example';
import fileRoute from './server/routes/file';
import lspRoute from './server/routes/lsp';
import manacoRoute from './server/routes/monaco';
import repositoryRoute from './server/routes/repository';
import ServerOptions from './server/ServerOptions';

export default (kibana: any) =>
  new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'castro',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'Castro',
        description: 'castro',
        main: 'plugins/castro/app',
      },

      hacks: ['plugins/castro/hack'],

      mappings,
    },

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        dataPath: Joi.string().default('/tmp'),
      }).default();
    },

    init(server: any, options: any) {
      const serverOptions = new ServerOptions(options);
      exampleRoute(server);
      lspRoute(server, serverOptions);
      repositoryRoute(server, serverOptions);
      fileRoute(server, serverOptions);
      manacoRoute(server);
    },
  });
