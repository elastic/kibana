/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-nodejs-modules -- server-only signing key generation for external resume links */

import { randomBytes } from 'crypto';
import type { Logger } from '@kbn/core/server';

export function resolveExternalResumeSigningKey(
  configuredSigningKey: string | undefined,
  logger: Logger,
  configPath: string
): string {
  if (configuredSigningKey) {
    return configuredSigningKey;
  }

  logger.warn(
    `Generating a random key for ${configPath}. To prevent external resume links from being invalidated on restart, set ${configPath} in kibana.yml or use bin/kibana-encryption-keys generate.`
  );

  return randomBytes(32).toString('hex');
}
