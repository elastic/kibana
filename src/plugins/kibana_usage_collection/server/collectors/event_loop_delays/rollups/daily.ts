/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import { ISavedObjectsRepository } from '../../../../../../core/server';

import {
  EventLoopDelaysDaily,
  deleteHistogramSavedObjects,
  SAVED_OBJECTS_DAILY_TYPE,
} from '../saved_objects';

/**
 * Deletes docs older than 3 days
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
    const { saved_objects: savedObjects } = await savedObjectsClient.find<EventLoopDelaysDaily>({
      type: SAVED_OBJECTS_DAILY_TYPE,
      filter: `${SAVED_OBJECTS_DAILY_TYPE}.updated_at < "now-3d/d"`,
    });
    const settledDeletes = await deleteHistogramSavedObjects(savedObjects, savedObjectsClient);
    const failedDeletes = settledDeletes.filter(({ status }) => status !== 'fulfilled');
    if (failedDeletes.length) {
      throw failedDeletes;
    }
  } catch (err) {
    logger.debug(`Failed to rollup transactional to daily entries`);
    logger.debug(err);
  }
}
