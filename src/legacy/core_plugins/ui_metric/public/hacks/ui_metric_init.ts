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
import chrome from 'ui/chrome';
import { createAnalyticsReporter, setTelemetryReporter } from '../services/telemetry_analytics';

function telemetryInit($injector: any) {
  const localStorage = $injector.get('localStorage');
  const debug = chrome.getInjected('debugUiMetric');
  const $http = $injector.get('$http');
  const basePath = chrome.getBasePath();
  const uiReporter = createAnalyticsReporter({ localStorage, $http, basePath, debug });
  setTelemetryReporter(uiReporter);
}

uiModules.get('kibana').run(telemetryInit);
