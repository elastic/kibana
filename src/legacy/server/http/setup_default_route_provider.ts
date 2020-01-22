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

import { Legacy } from 'kibana';
import { parse } from 'url';

export function setupDefaultRouteProvider(server: Legacy.Server) {
  server.decorate('request', 'getDefaultRoute', async function() {
    // @ts-ignore
    const request: Legacy.Request = this;

    const serverBasePath: string = server.config().get('server.basePath');

    const uiSettings = request.getUiSettingsService();

    const defaultRoute = await uiSettings.get<string>('defaultRoute');
    const qualifiedDefaultRoute = `${request.getBasePath()}${defaultRoute}`;

    if (isRelativePath(qualifiedDefaultRoute, serverBasePath)) {
      return qualifiedDefaultRoute;
    } else {
      server.log(
        ['http', 'warn'],
        `Ignoring configured default route of '${defaultRoute}', as it is malformed.`
      );

      const fallbackRoute = uiSettings.getRegistered().defaultRoute.value;

      const qualifiedFallbackRoute = `${request.getBasePath()}${fallbackRoute}`;
      return qualifiedFallbackRoute;
    }
  });

  function isRelativePath(candidatePath: string, basePath = '') {
    // validate that `candidatePath` is not attempting a redirect to somewhere
    // outside of this Kibana install
    const { protocol, hostname, port, pathname } = parse(
      candidatePath,
      false /* parseQueryString */,
      true /* slashesDenoteHost */
    );

    // We should explicitly compare `protocol`, `port` and `hostname` to null to make sure these are not
    // detected in the URL at all. For example `hostname` can be empty string for Node URL parser, but
    // browser (because of various bwc reasons) processes URL differently (e.g. `///abc.com` - for browser
    // hostname is `abc.com`, but for Node hostname is an empty string i.e. everything between schema (`//`)
    // and the first slash that belongs to path.
    if (protocol !== null || hostname !== null || port !== null) {
      return false;
    }

    if (!String(pathname).startsWith(basePath)) {
      return false;
    }

    return true;
  }
}
