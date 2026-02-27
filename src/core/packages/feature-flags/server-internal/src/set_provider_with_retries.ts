/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { type Provider, OpenFeature } from '@openfeature/server-sdk';
import pRetry from 'p-retry';

/**
 * Handles the setting of the Feature Flags provider and any retries that may be required.
 * This method is intentionally synchronous (no async/await) to avoid holding Kibana's startup on the feature flags setup.
 * @param provider The OpenFeature provider to set up.
 * @param logger You know, for logging.
 */
export function setProviderWithRetries(provider: Provider, logger: Logger): void {
  pRetry(() => OpenFeature.setProviderAndWait(provider), {
    retries: 5,
    onFailedAttempt: (error) => {
      logger.warn(
        `Failed to set up the feature flags provider: ${error.message}. Retrying ${error.retriesLeft} times more...`,
        { error }
      );
    },
  })
    .then(() => {
      logger.info('Feature flags provider successfully set up.');
    })
    .catch((error) => {
      logger.error(`Failed to set up the feature flags provider: ${error.message}`, {
        error,
      });
    });
}
