/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { ISavedObjectsRepository } from '@kbn/core/server';
import { MAIN_APP_DEFAULT_VIEW_ID } from '@kbn/usage-collection-plugin/common/constants';
import {
  ApplicationUsageDaily,
  ApplicationUsageTotal,
  SAVED_OBJECTS_DAILY_TYPE,
  SAVED_OBJECTS_TOTAL_TYPE,
} from '../saved_objects_types';
import { serializeKey } from './utils';

/**
 * Moves all the daily documents into aggregated "total" documents as we don't care about any granularity after 90 days
 * @param logger
 * @param savedObjectsClient
 */
export async function rollTotals(logger: Logger, savedObjectsClient?: ISavedObjectsRepository) {
  if (!savedObjectsClient) {
    return;
  }

  try {
    const usageTotalsFinder = savedObjectsClient.createPointInTimeFinder<ApplicationUsageTotal>({
      type: SAVED_OBJECTS_TOTAL_TYPE,
      perPage: 200,
    });
    const existingTotals: Record<
      string,
      { appId: string; viewId: string; minutesOnScreen: number; numberOfClicks: number }
    > = {};
    for await (const { saved_objects: savedObjects } of usageTotalsFinder.find()) {
      for (const savedObject of savedObjects) {
        const {
          appId,
          viewId = MAIN_APP_DEFAULT_VIEW_ID,
          numberOfClicks,
          minutesOnScreen,
        } = savedObject.attributes;

        const key = viewId === MAIN_APP_DEFAULT_VIEW_ID ? appId : serializeKey(appId, viewId);
        // No need to sum because there should be 1 document per appId only
        existingTotals[key] = { appId, viewId, numberOfClicks, minutesOnScreen };
      }
    }

    const usageDailyFinder = savedObjectsClient.createPointInTimeFinder<ApplicationUsageDaily>({
      type: SAVED_OBJECTS_DAILY_TYPE,
      filter: `${SAVED_OBJECTS_DAILY_TYPE}.attributes.timestamp < now-90d`,
      perPage: 200,
    });
    const totals = { ...existingTotals };
    const usageDailyIdsToDelete: string[] = [];
    for await (const { saved_objects: savedObjects } of usageDailyFinder.find()) {
      for (const savedObject of savedObjects) {
        const {
          appId,
          viewId = MAIN_APP_DEFAULT_VIEW_ID,
          numberOfClicks,
          minutesOnScreen,
        } = savedObject.attributes;
        const key = viewId === MAIN_APP_DEFAULT_VIEW_ID ? appId : serializeKey(appId, viewId);
        const existing = totals[key] || { minutesOnScreen: 0, numberOfClicks: 0 };

        totals[key] = {
          appId,
          viewId,
          numberOfClicks: numberOfClicks + existing.numberOfClicks,
          minutesOnScreen: minutesOnScreen + existing.minutesOnScreen,
        };
        usageDailyIdsToDelete.push(savedObject.id);
      }
    }

    await Promise.all([
      Object.entries(totals).length &&
        savedObjectsClient.bulkCreate<ApplicationUsageTotal>(
          Object.entries(totals).map(([id, entry]) => ({
            type: SAVED_OBJECTS_TOTAL_TYPE,
            id,
            attributes: entry,
          })),
          { overwrite: true }
        ),
      savedObjectsClient.bulkDelete(
        usageDailyIdsToDelete.map((id) => ({ id, type: SAVED_OBJECTS_DAILY_TYPE }))
      ),
    ]);
  } catch (err) {
    logger.debug(`Failed to rollup daily entries to totals`);
    logger.debug(err);
  }
}
