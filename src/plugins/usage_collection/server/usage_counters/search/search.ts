/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ISavedObjectsRepository,
  SavedObjectsFindOptions,
} from '@kbn/core-saved-objects-api-server';
import {
  serializeCounterKey,
  type UsageCountersSavedObjectAttributes,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
} from '../saved_objects';
import type {
  UsageCounterSnapshot,
  UsageCountersSearchOptions,
  UsageCountersSearchParams,
  UsageCountersSearchResult,
} from '../types';
import { usageCountersSearchParamsToKueryFilter } from './search_utils';

export async function searchUsageCounters(
  repository: ISavedObjectsRepository,
  params: UsageCountersSearchParams,
  options: UsageCountersSearchOptions = {}
): Promise<UsageCountersSearchResult> {
  const { namespace: filterNamespace } = params;
  const { perPage = 100, page = 1 } = options;

  const filter = usageCountersSearchParamsToKueryFilter(params);

  const findParams: SavedObjectsFindOptions = {
    ...(filterNamespace && { namespaces: [filterNamespace] }),
    type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    sortField: 'updated_at',
    sortOrder: 'desc',
    filter,
    searchFields: [USAGE_COUNTERS_SAVED_OBJECT_TYPE],
    perPage,
    page,
  };
  const res = await repository.find<UsageCountersSavedObjectAttributes>(findParams);

  const countersMap = new Map<string, UsageCounterSnapshot>();
  res.saved_objects.forEach(({ attributes, updated_at: updatedAt, namespaces }) => {
    const namespace = namespaces?.[0];
    const key = serializeCounterKey({ ...attributes, namespace });

    let counterSnapshot = countersMap.get(key);

    if (!counterSnapshot) {
      counterSnapshot = {
        domainId: attributes.domainId,
        counterName: attributes.counterName,
        counterType: attributes.counterType,
        source: attributes.source,
        ...(namespace && namespaces?.[0] && { namespace: namespaces[0] }),
        records: [
          {
            updatedAt: updatedAt!,
            count: attributes.count,
          },
        ],
      };

      countersMap.set(key, counterSnapshot!);
    } else {
      counterSnapshot.records.push({
        updatedAt: updatedAt!,
        count: attributes.count,
      });
    }
  });

  return {
    counters: Array.from(countersMap.values()),
  };
}
