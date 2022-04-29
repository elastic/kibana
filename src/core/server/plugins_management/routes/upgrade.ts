/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '../../http';
import { PluginsManager } from '../plugins_manager';

interface RouteConfigs {
  pluginsManager: PluginsManager;
}

export const registerUpgradeRoute = (router: IRouter, { pluginsManager }: RouteConfigs) => {
  router.post(
    {
      path: '/_upgrade',
      validate: false,
    },
    async (ctx, req, res) => {
      await pluginsManager.upgrade();
      return res.ok();
    }
  );
};
