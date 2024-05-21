/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleType } from '@kbn/triggers-actions-ui-types';

export type RuleTypeWithDescription = RuleType<string, string> & { description?: string };

export type RuleTypeIndexWithDescriptions = Map<string, RuleTypeWithDescription>;

export interface HealthStatus {
  isRulesAvailable: boolean;
  isSufficientlySecure: boolean;
  hasPermanentEncryptionKey: boolean;
}

export const healthCheckErrors = {
  ALERTS_ERROR: 'alertsError',
  ENCRYPTION_ERROR: 'encryptionError',
  API_KEYS_DISABLED_ERROR: 'apiKeysDisabledError',
  API_KEYS_AND_ENCRYPTION_ERROR: 'apiKeysAndEncryptionError',
} as const;

export type HealthCheckErrors = typeof healthCheckErrors[keyof typeof healthCheckErrors];
