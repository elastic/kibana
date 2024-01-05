/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import pRetry from 'p-retry';

import type { SearchIndexLogger, SearchIndexDoc, EsSearchIndexDoc } from './types';

/**
 * Calls a function; retries calling it multiple times via p-retry, if it fails.
 * Should retry on 2s, 4s, 8s, 16s.
 *
 * See: https://github.com/tim-kos/node-retry#retryoperationoptions
 *
 * @param fn Function to retry, if it fails.
 */
export async function retry<R>(
  fn: () => Promise<R>,
  fnName: string,
  logger: SearchIndexLogger
): Promise<R> {
  logger.debug(`Search index retry operation: ${fnName}`);

  return await pRetry(fn, {
    minTimeout: 1000,
    maxTimeout: 1000 * 60 * 3,
    retries: 4,
    factor: 2,
    randomize: true,
    onFailedAttempt: (err) => {
      const message =
        `Search index operation failed and will be retried: ${fnName};` +
        `${err.retriesLeft} more times; error: ${err.message}`;

      logger.warn(message);
    },
  });
}

// Temp just for TS
const isSearchIndexDoc = (doc: SearchIndexDoc | Partial<SearchIndexDoc>): doc is SearchIndexDoc =>
  true;

export const docToDto = <T extends SearchIndexDoc | Partial<SearchIndexDoc>>(
  doc: T,
  isNew: boolean = true
): T extends SearchIndexDoc ? EsSearchIndexDoc : Partial<EsSearchIndexDoc> => {
  const updatedAt = new Date().toISOString();

  if (isSearchIndexDoc(doc) && isNew) {
    const dto: EsSearchIndexDoc = {
      ...doc,
      updatedAt,
      createdAt: updatedAt,
    };
    return dto;
  }

  const dto: Partial<EsSearchIndexDoc> = {
    ...doc,
    updatedAt,
  };

  return dto as T extends SearchIndexDoc ? EsSearchIndexDoc : Partial<EsSearchIndexDoc>;
};
