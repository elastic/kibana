/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeHistoryClient } from '@kbn/change-history';
import type { CoreStart, Logger } from '@kbn/core/server';

const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60000;

let ready = false;
let changeHistoryClient: ChangeHistoryClient;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

export const startChangeHistoryClient = (
  client: ChangeHistoryClient,
  core: CoreStart,
  logger: Logger
) => {
  changeHistoryClient = client;
  ready = false;
  stopChangeHistoryClient();

  const attemptInitialize = (retryDelayMs: number) => {
    changeHistoryClient
      .initialize(core.elasticsearch.client.asInternalUser)
      .then(() => {
        ready = true;
        retryTimer = undefined;
      })
      .catch((cause) => {
        const error = new Error(
          `Unable to initialize dashboard change history, retrying in ${retryDelayMs}ms`,
          { cause }
        );
        logger.error(error);
        retryTimer = setTimeout(
          () => attemptInitialize(Math.min(retryDelayMs * 2, MAX_RETRY_DELAY_MS)),
          retryDelayMs
        );
      });
  };

  attemptInitialize(INITIAL_RETRY_DELAY_MS);
};

export const stopChangeHistoryClient = () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }
};

export const getChangeHistoryClient = () => {
  if (!ready || !changeHistoryClient) {
    throw new Error('ChangeHistoryClient is not ready yet.');
  }
  return changeHistoryClient;
};
