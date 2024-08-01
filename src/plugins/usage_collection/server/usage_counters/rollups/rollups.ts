/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import type { ISavedObjectsRepository, Logger, SavedObjectsFindOptions } from '@kbn/core/server';
import { groupBy } from 'lodash';
import { USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS } from './constants';
import { type UsageCountersSavedObjectAttributes, USAGE_COUNTERS_SAVED_OBJECT_TYPE } from '..';
import type { IUsageCounter } from '../usage_counter';
import { usageCountersSearchParamsToKueryFilter } from '../common/kuery_utils';

export async function rollUsageCountersIndices({
  logger,
  getRegisteredUsageCounters,
  internalRepository,
  now = moment(),
}: {
  logger: Logger;
  getRegisteredUsageCounters: () => IUsageCounter[];
  internalRepository?: ISavedObjectsRepository;
  now?: moment.Moment;
}) {
  if (!internalRepository) {
    return;
  }

  let cleanupCounter = 0;

  try {
    for (const counter of getRegisteredUsageCounters()) {
      const findParams: SavedObjectsFindOptions = {
        type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
        filter: usageCountersSearchParamsToKueryFilter({
          domainId: counter.domainId,
          to: moment(now)
            // get documents that are OLDER than the retention period
            .subtract(
              1 + (counter.retentionPeriodDays ?? USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS),
              'days'
            )
            .toISOString(),
        }),
        sortField: 'updated_at',
        sortOrder: 'asc',
        namespaces: ['*'],
        perPage: 1000, // Process 1000 at a time as a compromise of speed and overload
      };

      const { saved_objects: rawUiCounterDocs } =
        await internalRepository.find<UsageCountersSavedObjectAttributes>(findParams);

      if (rawUiCounterDocs.length) {
        const toDelete = rawUiCounterDocs.map(({ id, type, namespaces }) => ({
          id,
          type,
          namespace: namespaces?.[0] ?? 'default',
        }));
        cleanupCounter += toDelete.length;

        logger.debug(
          `[Rollups] Cleaning ${toDelete.length} old Usage Counters saved objects under domain '${counter.domainId}'`
        );

        const toDeleteByNamespace = groupBy(toDelete, 'namespace');

        // perform a Bulk delete for each namespace
        await Promise.all(
          Object.entries(toDeleteByNamespace).map(([namespace, counters]) =>
            internalRepository.bulkDelete(
              counters.map(({ namespace: _, ...props }) => ({ ...props })),
              { namespace }
            )
          )
        );
      }
    }
  } catch (err) {
    logger.warn(`Failed to rollup Usage Counters saved objects.`);
    logger.warn(err);
  }

  if (cleanupCounter) {
    logger.debug(`[Rollups] Cleaned ${cleanupCounter} Usage Counters saved objects`);
  }
  return cleanupCounter;
}
