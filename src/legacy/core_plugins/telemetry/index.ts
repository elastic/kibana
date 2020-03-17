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

import { resolve } from 'path';
import { Server } from 'hapi';
import { replaceTelemetryInjectedVars } from 'src/plugins/telemetry/server';

const telemetry = (kibana: any) => {
  return new kibana.Plugin({
    id: 'telemetry',
    configPrefix: 'telemetry',
    publicDir: resolve(__dirname, 'public'),
    require: ['elasticsearch'],
    uiExports: {
      managementSections: ['plugins/telemetry/views/management'],
      async replaceInjectedVars(originalInjectedVars: any, request: any, server: any) {
        const telemetryInjectedVars = await replaceTelemetryInjectedVars(request, server);
        return Object.assign({}, originalInjectedVars, telemetryInjectedVars);
      },
      injectDefaultVars(server: Server) {
        const config = server.config();
        return {
          telemetryEnabled: config.get('telemetry.enabled'),
          telemetryUrl: config.get('telemetry.url'),
          telemetryBanner:
            config.get('telemetry.allowChangingOptInStatus') !== false &&
            config.get('telemetry.banner'),
          telemetryOptedIn: config.get('telemetry.optIn'),
          telemetryOptInStatusUrl: config.get('telemetry.optInStatusUrl'),
          allowChangingOptInStatus: config.get('telemetry.allowChangingOptInStatus'),
          telemetrySendUsageFrom: config.get('telemetry.sendUsageFrom'),
          telemetryNotifyUserAboutOptInDefault: false,
        };
      },
    },
  });
};

// eslint-disable-next-line import/no-default-export
export default telemetry;
