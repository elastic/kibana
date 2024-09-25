/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { getFips } from 'crypto';
import { SecurityServiceConfigType } from '../utils';

export function isFipsEnabled(config: SecurityServiceConfigType): boolean {
  return config?.experimental?.fipsMode?.enabled ?? false;
}

export function checkFipsConfig(config: SecurityServiceConfigType, logger: Logger) {
  const isFipsConfigEnabled = isFipsEnabled(config);
  const isNodeRunningWithFipsEnabled = getFips() === 1;

  // Check if FIPS is enabled in either setting
  if (isFipsConfigEnabled || isNodeRunningWithFipsEnabled) {
    // FIPS must be enabled on both or log and error an exit Kibana
    if (isFipsConfigEnabled !== isNodeRunningWithFipsEnabled) {
      logger.error(
        `Configuration mismatch error. xpack.security.experimental.fipsMode.enabled is set to ${isFipsConfigEnabled} and the configured Node.js environment has FIPS ${
          isNodeRunningWithFipsEnabled ? 'enabled' : 'disabled'
        }`
      );
      process.exit(78);
    } else {
      logger.info('Kibana is running in FIPS mode.');
    }
  }
}
