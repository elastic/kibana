/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';

import {
  type UsageCountersSavedObject,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
} from '@kbn/usage-collection-plugin/server';
import { USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS } from './constants';
import { isSavedObjectOlderThan } from '../../common/saved_objects';

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
        namespaces: ['*'],
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
      docsToDelete.map(({ id, type, namespaces }) =>
        namespaces?.[0]
          ? savedObjectsClient.delete(type, id, { namespace: namespaces[0] })
          : savedObjectsClient.delete(type, id)
      )
    );
  } catch (err) {
    logger.warn(`Failed to rollup Usage Counters saved objects.`);
    logger.warn(err);
  }
}
