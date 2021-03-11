/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TelemetrySavedObject } from './types';

interface GetTelemetryFailureDetailsConfig {
  telemetrySavedObject: TelemetrySavedObject;
}

export interface TelemetryFailureDetails {
  failureCount: number;
  failureVersion?: string;
}

export function getTelemetryFailureDetails({
  telemetrySavedObject,
}: GetTelemetryFailureDetailsConfig): TelemetryFailureDetails {
  if (!telemetrySavedObject) {
    return {
      failureVersion: undefined,
      failureCount: 0,
    };
  }
  const { reportFailureCount, reportFailureVersion } = telemetrySavedObject;

  return {
    failureCount: typeof reportFailureCount === 'number' ? reportFailureCount : 0,
    failureVersion: typeof reportFailureVersion === 'string' ? reportFailureVersion : undefined,
  };
}
