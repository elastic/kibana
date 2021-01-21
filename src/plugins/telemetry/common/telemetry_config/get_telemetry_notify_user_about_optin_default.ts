/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TelemetrySavedObject } from './types';

interface NotifyOpts {
  allowChangingOptInStatus: boolean;
  telemetrySavedObject: TelemetrySavedObject;
  telemetryOptedIn: boolean | null;
  configTelemetryOptIn: boolean;
}

export function getNotifyUserAboutOptInDefault({
  allowChangingOptInStatus,
  telemetrySavedObject,
  telemetryOptedIn,
  configTelemetryOptIn,
}: NotifyOpts) {
  if (allowChangingOptInStatus === false) {
    return false;
  }

  // determine if notice has been seen before
  if (telemetrySavedObject && telemetrySavedObject.userHasSeenNotice === true) {
    return false;
  }

  return telemetryOptedIn === true && configTelemetryOptIn === true;
}
