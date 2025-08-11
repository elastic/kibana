/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger } from '@kbn/logging';
import { ElasticsearchClient } from '@kbn/core/server';
import { setupLockManagerIndex } from '../setup_lock_manager_index';

// The index assets should only be set up once
let runLockManagerSetupSuccessfully = false;
export const runSetupIndexAssetOnce = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  if (runLockManagerSetupSuccessfully) {
    return;
  }
  await setupLockManagerIndex(esClient, logger);
  runLockManagerSetupSuccessfully = true;
};

// For testing purposes, we need to be able to set it up every time
export function rerunSetupIndexAsset() {
  runLockManagerSetupSuccessfully = false;
}
