/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';

const MAX_ATTEMPTS = 3;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const retryTransientEsErrors = async <T>(
  esCall: () => Promise<T>,
  { logger, attempt = 0 }: { logger: Logger; attempt?: number }
): Promise<T> => {
  try {
    return await esCall();
  } catch (e) {
    if (attempt < MAX_ATTEMPTS && isRetryableEsClientError(e)) {
      const retryCount = attempt + 1;
      const retryDelaySec = Math.min(Math.pow(2, retryCount), 30); // 2s, 4s, 8s, 16s, 30s

      logger.warn(
        `Retrying Elasticsearch operation after [${retryDelaySec}s] due to error: ${e.toString()} ${
          e.stack
        }`
      );

      await delay(retryDelaySec * 1000 * Math.random());
      return retryTransientEsErrors(esCall, { logger, attempt: retryCount });
    }

    throw e;
  }
};
