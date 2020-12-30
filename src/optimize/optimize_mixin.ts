/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
