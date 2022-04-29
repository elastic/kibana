/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '../../http';
import type { AllowedPluginSource } from '../types';
import { PluginsManager } from '../plugins_manager'

interface RouteConfigs {
  pluginsManager: PluginsManager;
}

export const registerGetAllowedPluginSourcesRoute = (router: IRouter, { pluginsManager }: RouteConfigs) => {
  router.get(
    {
      path: '/_allowed_sources',
      validate: false,
    },
    async (ctx, req, res) => {
      console.log('oK i am called')
      const allowedPluginSources: AllowedPluginSource[] = await pluginsManager.getAllowedPluginSources();
      
      return res.ok({
        headers: { 'content-type': 'application/json' },
        body: { sources: allowedPluginSources },
      });
    }
  );
};
