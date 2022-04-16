/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    const [
      { saved_objects: rawApplicationUsageTotals },
      { saved_objects: rawApplicationUsageDaily },
    ] = await Promise.all([
      savedObjectsClient.find<ApplicationUsageTotal>({
        perPage: 10000,
        type: SAVED_OBJECTS_TOTAL_TYPE,
      }),
      savedObjectsClient.find<ApplicationUsageDaily>({
        perPage: 10000,
        type: SAVED_OBJECTS_DAILY_TYPE,
        filter: `${SAVED_OBJECTS_DAILY_TYPE}.attributes.timestamp < now-90d`,
      }),
    ]);

    const existingTotals = rawApplicationUsageTotals.reduce(
      (
        acc,
        {
          attributes: { appId, viewId = MAIN_APP_DEFAULT_VIEW_ID, numberOfClicks, minutesOnScreen },
        }
      ) => {
        const key = viewId === MAIN_APP_DEFAULT_VIEW_ID ? appId : serializeKey(appId, viewId);

        return {
          ...acc,
          // No need to sum because there should be 1 document per appId only
          [key]: { appId, viewId, numberOfClicks, minutesOnScreen },
        };
      },
      {} as Record<
        string,
        { appId: string; viewId: string; minutesOnScreen: number; numberOfClicks: number }
      >
    );

    const totals = rawApplicationUsageDaily.reduce((acc, { attributes }) => {
      const {
        appId,
        viewId = MAIN_APP_DEFAULT_VIEW_ID,
        numberOfClicks,
        minutesOnScreen,
      } = attributes;
      const key = viewId === MAIN_APP_DEFAULT_VIEW_ID ? appId : serializeKey(appId, viewId);
      const existing = acc[key] || { minutesOnScreen: 0, numberOfClicks: 0 };

      return {
        ...acc,
        [key]: {
          appId,
          viewId,
          numberOfClicks: numberOfClicks + existing.numberOfClicks,
          minutesOnScreen: minutesOnScreen + existing.minutesOnScreen,
        },
      };
    }, existingTotals);

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
      ...rawApplicationUsageDaily.map(
        ({ id }) => savedObjectsClient.delete(SAVED_OBJECTS_DAILY_TYPE, id) // There is no bulkDelete :(
      ),
    ]);
  } catch (err) {
    logger.debug(`Failed to rollup daily entries to totals`);
    logger.debug(err);
  }
}
