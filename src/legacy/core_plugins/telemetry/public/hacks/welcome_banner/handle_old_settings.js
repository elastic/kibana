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

import { CONFIG_TELEMETRY } from '../../../common/constants';

/**
 * Clean up any old, deprecated settings and determine if we should continue.
 *
 * This <em>will</em> update the latest telemetry setting if necessary.
 *
 * @param {Object} config The advanced settings config object.
 * @return {Boolean} {@code true} if the banner should still be displayed. {@code false} if the banner should not be displayed.
 */
const CONFIG_ALLOW_REPORT = 'xPackMonitoring:allowReport';

export async function handleOldSettings(config, telemetryOptInProvider) {
  const CONFIG_SHOW_BANNER = 'xPackMonitoring:showBanner';
  const oldAllowReportSetting = config.get(CONFIG_ALLOW_REPORT, null);
  const oldTelemetrySetting = config.get(CONFIG_TELEMETRY, null);

  let legacyOptInValue = null;

  if (typeof oldTelemetrySetting === 'boolean') {
    legacyOptInValue = oldTelemetrySetting;
  } else if (typeof oldAllowReportSetting === 'boolean') {
    legacyOptInValue = oldAllowReportSetting;
  }

  if (legacyOptInValue !== null) {
    try {
      await telemetryOptInProvider.setOptIn(legacyOptInValue);

      // delete old keys once we've successfully changed the setting (if it fails, we just wait until next time)
      config.remove(CONFIG_ALLOW_REPORT);
      config.remove(CONFIG_SHOW_BANNER);
      config.remove(CONFIG_TELEMETRY);
    } finally {
      return false;
    }
  }

  const oldShowSetting = config.get(CONFIG_SHOW_BANNER, null);

  if (oldShowSetting !== null) {
    config.remove(CONFIG_SHOW_BANNER);
  }

  return true;
}

export async function isOptInHandleOldSettings(config, telemetryOptInProvider) {
  const currentOptInSettting = telemetryOptInProvider.getOptIn();

  if (typeof currentOptInSettting === 'boolean') {
    return currentOptInSettting;
  }

  const oldTelemetrySetting = config.get(CONFIG_TELEMETRY, null);
  if (typeof oldTelemetrySetting === 'boolean') {
    return oldTelemetrySetting;
  }

  const oldAllowReportSetting = config.get(CONFIG_ALLOW_REPORT, null);
  if (typeof oldAllowReportSetting === 'boolean') {
    return oldAllowReportSetting;
  }

  return null;
}
