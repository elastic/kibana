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

import { npStart } from 'ui/new_platform';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { isUnauthenticated } from '../services';
// @ts-ignore
import { Telemetry } from './telemetry';
// @ts-ignore
import { fetchTelemetry } from './fetch_telemetry';
// @ts-ignore
import { isOptInHandleOldSettings } from './welcome_banner/handle_old_settings';
import { TelemetryOptInProvider } from '../services';

function telemetryInit($injector: any) {
  const $http = $injector.get('$http');
  const Private = $injector.get('Private');
  const config = $injector.get('config');
  const telemetryOptInProvider = Private(TelemetryOptInProvider);

  const telemetryEnabled = npStart.core.injectedMetadata.getInjectedVar('telemetryEnabled');
  const telemetryOptedIn = isOptInHandleOldSettings(config, telemetryOptInProvider);
  const sendUsageFrom = npStart.core.injectedMetadata.getInjectedVar('telemetrySendUsageFrom');

  if (telemetryEnabled && telemetryOptedIn && sendUsageFrom === 'browser') {
    // no telemetry for non-logged in users
    if (isUnauthenticated()) {
      return;
    }

    const sender = new Telemetry($injector, () => fetchTelemetry($http));
    sender.start();
  }
}

uiModules.get('telemetry/hacks').run(telemetryInit);
