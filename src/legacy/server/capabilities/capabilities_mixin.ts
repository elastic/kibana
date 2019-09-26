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

import { Server, Request } from 'hapi';

import { Capabilities } from '../../../core/public';
import KbnServer from '../kbn_server';
import { registerCapabilitiesRoute } from './capabilities_route';
import { mergeCapabilities } from './merge_capabilities';
import { resolveCapabilities } from './resolve_capabilities';

export type CapabilitiesModifier = (
  request: Request,
  uiCapabilities: Capabilities
) => Capabilities | Promise<Capabilities>;

export async function capabilitiesMixin(kbnServer: KbnServer, server: Server) {
  const modifiers: CapabilitiesModifier[] = [];

  server.decorate('server', 'registerCapabilitiesModifier', (provider: CapabilitiesModifier) => {
    modifiers.push(provider);
  });

  // Some plugin capabilities are derived from data provided by other plugins,
  // so we need to wait until after all plugins have been init'd to fetch uiCapabilities.
  kbnServer.afterPluginsInit(async () => {
    const defaultCapabilities = mergeCapabilities(
      ...(await Promise.all(
        kbnServer.pluginSpecs
          .map(spec => spec.getUiCapabilitiesProvider())
          .filter(provider => !!provider)
          .map(provider => provider(server))
      ))
    );

    server.decorate('request', 'getCapabilities', function() {
      // Get legacy nav links
      const navLinks = server.getUiNavLinks().reduce(
        (acc, spec) => ({
          ...acc,
          [spec._id]: true,
        }),
        {} as Record<string, boolean>
      );

      return resolveCapabilities(this, modifiers, defaultCapabilities, { navLinks });
    });

    registerCapabilitiesRoute(server, defaultCapabilities, modifiers);
  });
}
