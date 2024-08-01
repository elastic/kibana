/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { orderBy } from 'lodash';
import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type {
  ISavedObjectsRepository,
  SavedObjectsFindOptions,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import {
  serializeCounterKey,
  type UsageCountersSavedObjectAttributes,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
} from '../saved_objects';
import type {
  UsageCounterSnapshot,
  UsageCountersSearchParams,
  UsageCountersSearchResult,
} from '../types';
import { usageCountersSearchParamsToKueryFilter } from '../common/kuery_utils';

export async function searchUsageCounters(
  repository: ISavedObjectsRepository,
  params: UsageCountersSearchParams
): Promise<UsageCountersSearchResult> {
  const { filters, options = {} } = params;
  const { namespace: filterNamespace } = filters;

  const baseFindParams: SavedObjectsFindOptions = {
    ...(filterNamespace && { namespaces: [filterNamespace] }),
    type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    filter: usageCountersSearchParamsToKueryFilter(filters),
    perPage: options.perPage || 100,
  };

  // create a PIT to perform consecutive searches
  const pit = await repository.openPointInTimeForType(USAGE_COUNTERS_SAVED_OBJECT_TYPE);
  // create a data structure to store/aggregate all counters
  const countersMap = new Map<string, UsageCounterSnapshot>();
  // the current offset for the iterative search
  let searchAfter: SortResults | undefined;

  do {
    const findParams: SavedObjectsFindOptions = {
      ...baseFindParams,
      pit,
      ...(searchAfter && { searchAfter }),
    };

    // this is where the actual search call is performed
    const res = await repository.find<UsageCountersSavedObjectAttributes>(findParams);
    res.saved_objects.forEach((result) => processResult(countersMap, result));
    searchAfter = res.saved_objects.pop()?.sort;
  } while (searchAfter);

  await repository.closePointInTime(pit.id);

  const counters = Array.from(countersMap.values());

  // sort daily counters descending
  counters.forEach(
    (snapshot) => (snapshot.records = orderBy(snapshot.records, 'updatedAt', 'desc'))
  );

  return {
    counters,
  };
}

function processResult(
  countersMap: Map<string, UsageCounterSnapshot>,
  result: SavedObjectsFindResult<UsageCountersSavedObjectAttributes>
) {
  const { attributes, updated_at: updatedAt, namespaces } = result;
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
      count: attributes.count,
    };

    countersMap.set(key, counterSnapshot!);
  } else {
    counterSnapshot.records.push({
      updatedAt: updatedAt!,
      count: attributes.count,
    });
    counterSnapshot.count += attributes.count;
  }
}
