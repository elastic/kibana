/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import { ISavedObjectsRepository } from '@kbn/core/server';
import { deleteHistogramSavedObjects } from '../saved_objects';

/**
 * daily rollup function. Deletes histogram saved objects older than 3 days
 * @param logger
 * @param savedObjectsClient
 */
export async function rollDailyData(
  logger: Logger,
  savedObjectsClient?: ISavedObjectsRepository
): Promise<void> {
  if (!savedObjectsClient) {
    return;
  }
  try {
    const settledDeletes = await deleteHistogramSavedObjects(savedObjectsClient);
    const failedDeletes = settledDeletes.filter(({ status }) => status !== 'fulfilled');
    if (failedDeletes.length) {
      throw failedDeletes;
    }
  } catch (err) {
    logger.debug(`Failed to rollup transactional to daily entries`);
    logger.debug(err);
  }
}
