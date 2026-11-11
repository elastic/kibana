/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { errors as EsErrors } from '@elastic/elasticsearch';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';

/** Attempts after the initial one. Bootstrap runs while a cluster may still be starting. */
export const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 10_000;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Full jitter, so the nodes of a booting cluster do not retry in lockstep. */
const backoff = (attempt: number) =>
  Math.random() * Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);

/**
 * Runs an index bootstrap call, retrying the Elasticsearch errors that a starting or busy cluster
 * produces (no living connections, timeouts, unavailable shards). Resource creation runs on the
 * first read or write after a deploy, when the cluster is least likely to be ready, and a failure
 * there fails the caller's request rather than only the installation.
 */
export const retryTransientEsErrors = async <T>(
  operation: string,
  esCall: () => Promise<T>,
  { logger }: { logger: Logger }
): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await esCall();
    } catch (error) {
      if (
        attempt >= MAX_RETRIES ||
        !isRetryableEsClientError(error as EsErrors.ElasticsearchClientError)
      ) {
        throw error;
      }

      const delayMs = backoff(attempt);
      logger.debug(
        `Retrying ${operation} in ${Math.round(delayMs)}ms after a transient Elasticsearch error: ${
          (error as Error).message
        }`
      );
      await delay(delayMs);
    }
  }
};
