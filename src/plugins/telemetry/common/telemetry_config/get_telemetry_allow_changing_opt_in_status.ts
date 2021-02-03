/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TelemetrySavedObject } from './types';

interface GetTelemetryAllowChangingOptInStatus {
  configTelemetryAllowChangingOptInStatus: boolean;
  telemetrySavedObject: TelemetrySavedObject;
}

export function getTelemetryAllowChangingOptInStatus({
  telemetrySavedObject,
  configTelemetryAllowChangingOptInStatus,
}: GetTelemetryAllowChangingOptInStatus) {
  if (!telemetrySavedObject) {
    return configTelemetryAllowChangingOptInStatus;
  }

  if (typeof telemetrySavedObject.allowChangingOptInStatus === 'undefined') {
    return configTelemetryAllowChangingOptInStatus;
  }

  return telemetrySavedObject.allowChangingOptInStatus;
}
