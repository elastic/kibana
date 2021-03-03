/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ANOMALY_SEVERITY } from '../constants/anomalies';

export function getSeverityType(normalizedScore: number): ANOMALY_SEVERITY {
  if (normalizedScore >= 75) {
    return ANOMALY_SEVERITY.CRITICAL;
  } else if (normalizedScore >= 50) {
    return ANOMALY_SEVERITY.MAJOR;
  } else if (normalizedScore >= 25) {
    return ANOMALY_SEVERITY.MINOR;
  } else if (normalizedScore >= 3) {
    return ANOMALY_SEVERITY.WARNING;
  } else if (normalizedScore >= 0) {
    return ANOMALY_SEVERITY.LOW;
  } else {
    return ANOMALY_SEVERITY.UNKNOWN;
  }
}
