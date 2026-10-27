/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeHistoryClient } from '@kbn/change-history';
import type { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';

let changeHistoryClient: ChangeHistoryClient | undefined;
let esClient: ElasticsearchClient;
let logger: Logger;
let initPromise: Promise<void> | undefined;

const initialize = (): Promise<void> => {
  if (!changeHistoryClient) return Promise.reject(new Error('ChangeHistoryClient is not started.'));
  const promise: Promise<void> = changeHistoryClient.initialize(esClient).catch((cause) => {
    // Clear so the next request retries, unless the service was restarted in the meantime
    if (initPromise === promise) initPromise = undefined;
    throw new Error('Unable to initialize dashboard change history', { cause });
  });
  initPromise = promise;
  return promise;
};

export const startChangeHistoryClient = (
  client: ChangeHistoryClient,
  core: CoreStart,
  pluginLogger: Logger
) => {
  changeHistoryClient = client;
  esClient = core.elasticsearch.client.asInternalUser;
  logger = pluginLogger;
  // warm up eagerly; a failure is retried lazily by the next getChangeHistoryClient call
  initialize().catch((error) => logger.error(error));
};

export const getChangeHistoryClient = async (): Promise<ChangeHistoryClient> => {
  await (initPromise ?? initialize());
  if (!changeHistoryClient) throw new Error('ChangeHistoryClient is not started.');
  return changeHistoryClient;
};
