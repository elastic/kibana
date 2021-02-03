/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Hapi from '@hapi/hapi';

import { createBundlesRoute } from './bundles_route';
import { getNpUiPluginPublicDirs } from './np_ui_plugin_public_dirs';
import KbnServer, { KibanaConfig } from '../legacy/server/kbn_server';

export const optimizeMixin = async (
  kbnServer: KbnServer,
  server: Hapi.Server,
  config: KibanaConfig
) => {
  server.route(
    createBundlesRoute({
      basePublicPath: config.get('server.basePath'),
      npUiPluginPublicDirs: getNpUiPluginPublicDirs(kbnServer),
      buildHash: kbnServer.newPlatform.env.packageInfo.buildNum.toString(),
      isDist: kbnServer.newPlatform.env.packageInfo.dist,
    })
  );
};
