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

/**
 * Clean up any old, deprecated settings and determine if we should continue.
 *
 * This <em>will</em> update the latest telemetry setting if necessary.
 *
 * @param {Object} config The advanced settings config object.
 * @return {Boolean} {@code true} if the banner should still be displayed. {@code false} if the banner should not be displayed.
 */

import { Server } from 'hapi';
import { CONFIG_TELEMETRY } from '../../common/constants';
import { updateTelemetrySavedObject } from '../telemetry_repository';

const CONFIG_ALLOW_REPORT = 'xPackMonitoring:allowReport';

export async function handleOldSettings(server: Server) {
  const { getSavedObjectsRepository } = server.savedObjects;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const savedObjectsClient = getSavedObjectsRepository(callWithInternalUser);
  const uiSettings = server.uiSettingsServiceFactory({ savedObjectsClient });

  const oldTelemetrySetting = await uiSettings.get(CONFIG_TELEMETRY);
  const oldAllowReportSetting = await uiSettings.get(CONFIG_ALLOW_REPORT);
  let legacyOptInValue = null;

  if (typeof oldTelemetrySetting === 'boolean') {
    legacyOptInValue = oldTelemetrySetting;
  } else if (
    typeof oldAllowReportSetting === 'boolean' &&
    uiSettings.isOverridden(CONFIG_ALLOW_REPORT)
  ) {
    legacyOptInValue = oldAllowReportSetting;
  }

  if (legacyOptInValue !== null) {
    await updateTelemetrySavedObject(savedObjectsClient, {
      enabled: legacyOptInValue,
    });
  }
}
