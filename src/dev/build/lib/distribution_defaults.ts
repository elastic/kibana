/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Platform } from './platform';

export interface DistributionDefaults {
  readonly kibana: Readonly<Record<string, string | number | boolean>>;
  readonly nodeOptions: readonly string[];
  readonly nodeEnvironment: Readonly<Record<string, string>>;
}

/** Returns configuration defaults and environment paths relative to the distribution root. */
export const getDistributionDefaults = (platform: Platform): DistributionDefaults => {
  if (platform.isFips()) {
    return {
      kibana: { 'xpack.security.fipsMode.enabled': true },
      nodeOptions: ['--enable-fips'],
      nodeEnvironment: {
        OPENSSL_CONF: 'node/fips/config/nodejs.cnf',
        OPENSSL_CONF_INCLUDE: 'node/fips/config',
        OPENSSL_MODULES: 'node/fips/modules',
      },
    };
  }

  return { kibana: {}, nodeOptions: [], nodeEnvironment: {} };
};
