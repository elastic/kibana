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

let sharedSigningKey: string | undefined;

export function resolveExternalResumeSigningKey(
  configuredSigningKey: string | undefined,
  logger: Logger,
  configPath: string
): string {
  if (configuredSigningKey) {
    sharedSigningKey = configuredSigningKey;
    return configuredSigningKey;
  }

  if (sharedSigningKey) {
    return sharedSigningKey;
  }

  logger.warn(
    `Generating an ephemeral external resume signing key (${configPath} is unset). ` +
      `Set the same value for workflowsManagement.externalResume.signingKey and ` +
      `workflowsExecutionEngine.externalResume.signingKey in kibana.yml to persist across restarts.`
  );

  sharedSigningKey = randomBytes(32).toString('hex');
  return sharedSigningKey;
}

/** @internal */
export function resetExternalResumeSigningKeyForTests(): void {
  sharedSigningKey = undefined;
}
