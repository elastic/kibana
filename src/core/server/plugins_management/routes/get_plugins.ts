/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '../../http';
import type { PluginDescriptor } from '../types';
import { PluginsManager } from '../plugins_manager';

interface RouteConfigs {
  pluginsManager: PluginsManager;
}

export const registerGetPluginsRoute = (router: IRouter, { pluginsManager }: RouteConfigs) => {
  router.get(
    {
      path: '/',
      validate: {},
      options: {
        authRequired: false,
      },
    },
    (ctx, req, res) => {
      const pluginDescriptors: PluginDescriptor[] = pluginsManager.getPluginDescriptors();

      return res.ok({
        headers: { 'content-type': 'application/json' },
        body: pluginDescriptors,
      });
    }
  );
};
