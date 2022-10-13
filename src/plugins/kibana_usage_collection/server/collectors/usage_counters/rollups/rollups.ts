/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import moment from 'moment';

import {
  UsageCountersSavedObject,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
} from '@kbn/usage-collection-plugin/server';
import { USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS } from './constants';

export function isSavedObjectOlderThan({
  numberOfDays,
  startDate,
  doc,
}: {
  numberOfDays: number;
  startDate: moment.Moment | string | number;
  doc: Pick<UsageCountersSavedObject, 'updated_at'>;
}): boolean {
  const { updated_at: updatedAt } = doc;
  const today = moment(startDate).startOf('day');
  const updateDay = moment(updatedAt).startOf('day');

  const diffInDays = today.diff(updateDay, 'days');
  if (diffInDays > numberOfDays) {
    return true;
  }

  return false;
}

export async function rollUsageCountersIndices(
  logger: Logger,
  savedObjectsClient?: ISavedObjectsRepository
) {
  if (!savedObjectsClient) {
    return;
  }

  const now = moment();

  try {
    const { saved_objects: rawUiCounterDocs } =
      await savedObjectsClient.find<UsageCountersSavedObject>({
        type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
        perPage: 1000, // Process 1000 at a time as a compromise of speed and overload
      });

    const docsToDelete = rawUiCounterDocs.filter((doc) =>
      isSavedObjectOlderThan({
        numberOfDays: USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS,
        startDate: now,
        doc,
      })
    );

    return await Promise.all(
      docsToDelete.map(({ id }) => savedObjectsClient.delete(USAGE_COUNTERS_SAVED_OBJECT_TYPE, id))
    );
  } catch (err) {
    logger.warn(`Failed to rollup Usage Counters saved objects.`);
    logger.warn(err);
  }
}
