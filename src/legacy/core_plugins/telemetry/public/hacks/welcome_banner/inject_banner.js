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

import chrome from 'ui/chrome';
import { npStart } from 'ui/new_platform';

import { renderBanner } from './render_banner';
import { getTelemetryOptInService, isUnauthenticated } from '../../services';

/**
 * Add the Telemetry opt-in banner if the user has not already made a decision.
 *
 * Note: this is an async function, but Angular fails to use it as one. Its usage does not need to be awaited,
 * and thus it can be wrapped in the run method to just be a normal, non-async function.
 */
async function asyncInjectBanner() {
  const telemetryOptInService = getTelemetryOptInService();

  // and no banner for non-logged in users
  if (isUnauthenticated()) {
    return;
  }

  // and no banner on status page
  if (chrome.getApp().id === 'status_page') {
    return;
  }

  renderBanner(telemetryOptInService);
}

/**
 * Add the Telemetry opt-in banner when appropriate.
 */
export function injectBanner() {
  const telemetryEnabled = npStart.core.injectedMetadata.getInjectedVar('telemetryEnabled');
  const telemetryBanner = npStart.core.injectedMetadata.getInjectedVar('telemetryBanner');
  if (telemetryEnabled && telemetryBanner) {
    asyncInjectBanner();
  }
}
