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
import { CriticalError } from '@kbn/core-base-server-internal';
import type { PKCS12ConfigType, SecurityServiceConfigType } from '../utils';
export function isFipsEnabled(config: SecurityServiceConfigType | undefined) {
  return config?.fipsMode?.enabled ?? false;
}

export function checkFipsConfig(
  config: SecurityServiceConfigType | undefined,
  elasticsearchConfig: PKCS12ConfigType,
  serverConfig: PKCS12ConfigType,
  logger: Logger
) {
  const isFipsConfigEnabled = isFipsEnabled(config);
  const isNodeRunningWithFipsEnabled = getFips() === 1;

  // Check if FIPS is enabled in either setting
  if (isFipsConfigEnabled || isNodeRunningWithFipsEnabled) {
    const definedPKCS12ConfigOptions = findDefinedPKCS12ConfigOptions(
      elasticsearchConfig,
      serverConfig
    );
    // FIPS must be enabled on both, or, log/error an exit Kibana
    if (isFipsConfigEnabled !== isNodeRunningWithFipsEnabled) {
      throw new CriticalError(
        `Configuration mismatch error. xpack.security.fipsMode.enabled is set to ${isFipsConfigEnabled} and the configured Node.js environment has FIPS ${
          isNodeRunningWithFipsEnabled ? 'enabled' : 'disabled'
        }`,
        'invalidConfig',
        78
      );
    } else if (definedPKCS12ConfigOptions.length > 0) {
      throw new CriticalError(
        `Configuration mismatch error: ${definedPKCS12ConfigOptions.join(', ')} ${
          definedPKCS12ConfigOptions.length > 1 ? 'are' : 'is'
        } set, PKCS12 configurations are not allowed while running in FIPS mode.`,
        'invalidConfig',
        78
      );
    } else {
      logger.info('Kibana is running in FIPS mode.');
    }
  }
}

function findDefinedPKCS12ConfigOptions(
  elasticsearchConfig: PKCS12ConfigType,
  serverConfig: PKCS12ConfigType
): string[] {
  const result = [];
  if (elasticsearchConfig?.ssl?.keystore?.path) {
    result.push('elasticsearch.ssl.keystore.path');
  }

  if (elasticsearchConfig?.ssl?.truststore?.path) {
    result.push('elasticsearch.ssl.truststore.path');
  }

  if (serverConfig?.ssl?.keystore?.path) {
    result.push('server.ssl.keystore.path');
  }

  if (serverConfig?.ssl?.truststore?.path) {
    result.push('server.ssl.truststore.path');
  }

  return result;
}
