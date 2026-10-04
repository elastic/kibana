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

let ready = false;
let changeHistoryClient: ChangeHistoryClient;

export const startChangeHistoryClient = (
  client: ChangeHistoryClient,
  core: CoreStart,
  logger: Logger
) => {
  changeHistoryClient = client;
  changeHistoryClient
    .initialize(core.elasticsearch.client.asInternalUser)
    .then(() => {
      ready = true;
    })
    .catch((cause) => {
      const error = new Error(`Unable to initialize dashboard change history`, { cause });
      logger.error(error);
    });
};

export const getChangeHistoryClient = () => {
  if (!ready || !changeHistoryClient) {
    throw new Error('ChangeHistoryClient is not ready yet.');
  }
  return changeHistoryClient;
};
