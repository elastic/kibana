/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TelemetrySavedObject } from '../saved_objects';

interface GetTelemetryAllowChangingOptInStatus {
  configTelemetryAllowChangingOptInStatus: boolean;
  telemetrySavedObject?: TelemetrySavedObject;
}

export function getTelemetryAllowChangingOptInStatus({
  telemetrySavedObject,
  configTelemetryAllowChangingOptInStatus,
}: GetTelemetryAllowChangingOptInStatus) {
  return telemetrySavedObject?.allowChangingOptInStatus ?? configTelemetryAllowChangingOptInStatus;
}
