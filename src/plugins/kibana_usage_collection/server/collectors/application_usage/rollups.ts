/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ISavedObjectsRepository, SavedObject, Logger } from 'kibana/server';
import moment from 'moment';
import {
  ApplicationUsageDaily,
  ApplicationUsageTotal,
  ApplicationUsageTransactional,
  SAVED_OBJECTS_DAILY_TYPE,
  SAVED_OBJECTS_TOTAL_TYPE,
  SAVED_OBJECTS_TRANSACTIONAL_TYPE,
} from './saved_objects_types';
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import { MAIN_APP_DEFAULT_VIEW_ID } from '../../../../usage_collection/common/constants';

/**
 * For Rolling the daily data, we only care about the stored attributes and the version (to avoid overwriting via concurrent requests)
 */
type ApplicationUsageDailyWithVersion = Pick<
  SavedObject<ApplicationUsageDaily>,
  'version' | 'attributes'
>;

export function serializeKey(appId: string, viewId: string) {
  return `${appId}___${viewId}`;
}

/**
 * Aggregates all the transactional events into daily aggregates
 * @param logger
 * @param savedObjectsClient
 */
export async function rollDailyData(logger: Logger, savedObjectsClient?: ISavedObjectsRepository) {
  if (!savedObjectsClient) {
    return;
  }

  try {
    let toCreate: Map<string, ApplicationUsageDailyWithVersion>;
    do {
      toCreate = new Map();
      const {
        saved_objects: rawApplicationUsageTransactional,
      } = await savedObjectsClient.find<ApplicationUsageTransactional>({
        type: SAVED_OBJECTS_TRANSACTIONAL_TYPE,
        perPage: 1000, // Process 1000 at a time as a compromise of speed and overload
      });

      for (const doc of rawApplicationUsageTransactional) {
        const {
          attributes: { appId, viewId, minutesOnScreen, numberOfClicks, timestamp },
        } = doc;
        const dayId = moment(timestamp).format('YYYY-MM-DD');

        const dailyId =
          !viewId || viewId === MAIN_APP_DEFAULT_VIEW_ID
            ? `${appId}:${dayId}`
            : `${appId}:${dayId}:${viewId}`;

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
  } catch (err) {
    logger.warn(`Failed to rollup transactional to daily entries`);
    logger.warn(err);
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
    return await savedObjectsClient.get<ApplicationUsageDaily>(SAVED_OBJECTS_DAILY_TYPE, id);
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
    logger.warn(`Failed to rollup daily entries to totals`);
    logger.warn(err);
  }
}
