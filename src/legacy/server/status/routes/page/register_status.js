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

import { wrapAuthConfig } from '../../wrap_auth_config';

export function registerStatusPage(kbnServer, server, config) {
  const allowAnonymous = config.get('status.allowAnonymous');
  const wrapAuth = wrapAuthConfig(allowAnonymous);

  server.decorate('toolkit', 'renderStatusPage', async function () {
    const app = server.getHiddenUiAppById('status_page');
    const h = this;

    let response;
    // An unauthenticated (anonymous) user may not have access to the customized configuration.
    // For this scenario, render with the default config.
    if (app) {
      response = allowAnonymous ? await h.renderAppWithDefaultConfig(app) : await h.renderApp(app);
    } else {
      h.response(kbnServer.status.toString());
    }

    if (response) {
      return response.code(kbnServer.status.isGreen() ? 200 : 503);
    }
  });

  server.route(
    wrapAuth({
      method: 'GET',
      path: '/status',
      handler(request, h) {
        return h.renderStatusPage();
      },
    })
  );
}
