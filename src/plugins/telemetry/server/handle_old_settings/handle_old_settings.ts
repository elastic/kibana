/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Clean up any old, deprecated settings and determine if we should continue.
 *
 * This <em>will</em> update the latest telemetry setting if necessary.
 *
 * @param {Object} config The advanced settings config object.
 * @return {Boolean} {@code true} if the banner should still be displayed. {@code false} if the banner should not be displayed.
 */

import { IUiSettingsClient, SavedObjectsClientContract } from 'kibana/server';
import { CONFIG_TELEMETRY } from '../../common/constants';
import { updateTelemetrySavedObject } from '../telemetry_repository';

const CONFIG_ALLOW_REPORT = 'xPackMonitoring:allowReport';

export async function handleOldSettings(
  savedObjectsClient: SavedObjectsClientContract,
  uiSettingsClient: IUiSettingsClient
) {
  const oldTelemetrySetting = await uiSettingsClient.get(CONFIG_TELEMETRY);
  const oldAllowReportSetting = await uiSettingsClient.get(CONFIG_ALLOW_REPORT);
  let legacyOptInValue = null;

  if (typeof oldTelemetrySetting === 'boolean') {
    legacyOptInValue = oldTelemetrySetting;
  } else if (
    typeof oldAllowReportSetting === 'boolean' &&
    uiSettingsClient.isOverridden(CONFIG_ALLOW_REPORT)
  ) {
    legacyOptInValue = oldAllowReportSetting;
  }

  if (legacyOptInValue !== null) {
    await updateTelemetrySavedObject(savedObjectsClient, {
      enabled: legacyOptInValue,
    });
  }
}
