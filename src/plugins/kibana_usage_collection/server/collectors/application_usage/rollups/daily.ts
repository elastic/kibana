/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import type { Logger } from '@kbn/logging';
import { ISavedObjectsRepository, SavedObject, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { getDailyId } from '@kbn/usage-collection-plugin/common/application_usage';
import {
  ApplicationUsageDaily,
  ApplicationUsageTransactional,
  SAVED_OBJECTS_DAILY_TYPE,
  SAVED_OBJECTS_TRANSACTIONAL_TYPE,
} from '../saved_objects_types';

/**
 * For Rolling the daily data, we only care about the stored attributes and the version (to avoid overwriting via concurrent requests)
 */
type ApplicationUsageDailyWithVersion = Pick<
  SavedObject<ApplicationUsageDaily>,
  'version' | 'attributes'
>;

/**
 * Aggregates all the transactional events into daily aggregates
 * @param logger
 * @param savedObjectsClient
 */
export async function rollDailyData(
  logger: Logger,
  savedObjectsClient?: ISavedObjectsRepository
): Promise<boolean> {
  if (!savedObjectsClient) {
    return false;
  }

  try {
    let toCreate: Map<string, ApplicationUsageDailyWithVersion>;
    do {
      toCreate = new Map();
      const { saved_objects: rawApplicationUsageTransactional } =
        await savedObjectsClient.find<ApplicationUsageTransactional>({
          type: SAVED_OBJECTS_TRANSACTIONAL_TYPE,
          perPage: 1000, // Process 1000 at a time as a compromise of speed and overload
        });

      for (const doc of rawApplicationUsageTransactional) {
        const {
          attributes: { appId, viewId, minutesOnScreen, numberOfClicks, timestamp },
        } = doc;
        const dayId = moment(timestamp).format('YYYY-MM-DD');

        const dailyId = getDailyId({ dayId, appId, viewId });

        const existingDoc =
          toCreate.get(dailyId) ||
          (await getDailyDoc(savedObjectsClient, dailyId, appId, viewId, dayId));
        toCreate.set(dailyId, {
          ...existingDoc,
          attributes: {
            ...existingDoc.attributes,
            minutesOnScreen: existingDoc.attributes.minutesOnScreen + minutesOnScreen,
            numberOfClicks: existingDoc.attributes.numberOfClicks + numberOfClicks,
          },
        });
      }
      if (toCreate.size > 0) {
        await savedObjectsClient.bulkCreate(
          [...toCreate.entries()].map(([id, { attributes, version }]) => ({
            type: SAVED_OBJECTS_DAILY_TYPE,
            id,
            attributes,
            version, // Providing version to ensure via conflict matching that only 1 Kibana instance (or interval) is taking care of the updates
          })),
          { overwrite: true }
        );
        const promiseStatuses = await Promise.allSettled(
          rawApplicationUsageTransactional.map(
            ({ id }) => savedObjectsClient.delete(SAVED_OBJECTS_TRANSACTIONAL_TYPE, id) // There is no bulkDelete :(
          )
        );
        const rejectedPromises = promiseStatuses.filter(
          (settledResult): settledResult is PromiseRejectedResult =>
            settledResult.status === 'rejected'
        );
        if (rejectedPromises.length > 0) {
          throw new Error(
            `Failed to delete some items in ${SAVED_OBJECTS_TRANSACTIONAL_TYPE}: ${JSON.stringify(
              rejectedPromises.map(({ reason }) => reason)
            )}`
          );
        }
      }
    } while (toCreate.size > 0);
    return true;
  } catch (err) {
    logger.debug(`Failed to rollup transactional to daily entries`);
    logger.debug(err);
    return false;
  }
}

/**
 * Gets daily doc from the SavedObjects repository. Creates a new one if not found
 * @param savedObjectsClient
 * @param id The ID of the document to retrieve (typically, `${appId}:${dayId}`)
 * @param appId The application ID
 * @param viewId The application view ID
 * @param dayId The date of the document in the format YYYY-MM-DD
 */
async function getDailyDoc(
  savedObjectsClient: ISavedObjectsRepository,
  id: string,
  appId: string,
  viewId: string,
  dayId: string
): Promise<ApplicationUsageDailyWithVersion> {
  try {
    const { attributes, version } = await savedObjectsClient.get<ApplicationUsageDaily>(
      SAVED_OBJECTS_DAILY_TYPE,
      id
    );
    return { attributes, version };
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return {
        attributes: {
          appId,
          viewId,
          // Concatenating the day in YYYY-MM-DD form to T00:00:00Z to reduce the TZ effects
          timestamp: moment(`${moment(dayId).format('YYYY-MM-DD')}T00:00:00Z`).toISOString(),
          minutesOnScreen: 0,
          numberOfClicks: 0,
        },
      };
    }
    throw err;
  }
}
