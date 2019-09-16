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

// @ts-ignore
import { uiModules } from 'ui/modules';
// @ts-ignore
import { Path } from 'plugins/xpack_main/services/path';
// @ts-ignore
import { npStart } from 'ui/new_platform';
// @ts-ignore
import { Telemetry } from './telemetry';
// @ts-ignore
import { fetchTelemetry } from './fetch_telemetry';

function telemetryInit($injector: any) {
  const $http = $injector.get('$http');

  const telemetryEnabled = npStart.core.injectedMetadata.getInjectedVar('telemetryEnabled');

  if (telemetryEnabled) {
    // no telemetry for non-logged in users
    if (Path.isUnauthenticated()) {
      return;
    }

    const sender = new Telemetry($injector, () => fetchTelemetry($http));
    sender.start();
  }
}

uiModules.get('telemetry/hacks').run(telemetryInit);
