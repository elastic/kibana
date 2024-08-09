/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface UiHealthCheck {
  isRulesAvailable: boolean;
}

export interface UiHealthCheckResponse {
  isAlertsAvailable: boolean;
}

export const healthCheckErrors = {
  ALERTS_ERROR: 'alertsError',
  ENCRYPTION_ERROR: 'encryptionError',
  API_KEYS_DISABLED_ERROR: 'apiKeysDisabledError',
  API_KEYS_AND_ENCRYPTION_ERROR: 'apiKeysAndEncryptionError',
} as const;

export type HealthCheckErrors = (typeof healthCheckErrors)[keyof typeof healthCheckErrors];
