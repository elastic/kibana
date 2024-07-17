/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS } from './constants';
import { type UsageCountersSavedObjectAttributes, USAGE_COUNTERS_SAVED_OBJECT_TYPE } from '..';
import { isSavedObjectOlderThan } from '../saved_objects';
import type { GetUsageCounter } from '../types';

export async function rollUsageCountersIndices({
  logger,
  usageCounters,
  internalRepository,
}: {
  logger: Logger;
  usageCounters: GetUsageCounter;
  internalRepository?: ISavedObjectsRepository;
}) {
  if (!internalRepository) {
    return;
  }

  const now = moment();

  try {
    const { saved_objects: rawUiCounterDocs } =
      await internalRepository.find<UsageCountersSavedObjectAttributes>({
        type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
        namespaces: ['*'],
        perPage: 1000, // Process 1000 at a time as a compromise of speed and overload
      });

    const docsToDelete = rawUiCounterDocs.filter((doc) =>
      isSavedObjectOlderThan({
        numberOfDays:
          usageCounters.getUsageCounterByDomainId(doc.attributes.domainId)?.retentionPeriodDays ||
          USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS,
        startDate: now,
        doc,
      })
    );

    return await Promise.all(
      docsToDelete.map(({ id, type, namespaces }) =>
        namespaces?.[0]
          ? internalRepository.delete(type, id, { namespace: namespaces[0] })
          : internalRepository.delete(type, id)
      )
    );
  } catch (err) {
    logger.warn(`Failed to rollup Usage Counters saved objects.`);
    logger.warn(err);
  }
}
