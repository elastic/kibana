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

import { Server } from 'hapi';
import KbnServer from '../kbn_server';

export async function capabilitiesMixin(kbnServer: KbnServer, server: Server) {
  const registerLegacyCapabilities = async () => {
    const capabilitiesList = await Promise.all(
      kbnServer.pluginSpecs
        .map(spec => spec.getUiCapabilitiesProvider())
        .filter(provider => !!provider)
        .map(provider => provider(server))
    );

    capabilitiesList.forEach(capabilities => {
      kbnServer.newPlatform.setup.core.capabilities.registerProvider(() => capabilities);
    });
  };

  // Some plugin capabilities are derived from data provided by other plugins,
  // so we need to wait until after all plugins have been init'd to fetch uiCapabilities.
  kbnServer.afterPluginsInit(async () => {
    await registerLegacyCapabilities();
  });
}
