/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { USAGE_COUNTERS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { ISavedObjectsRepository, SavedObject, ElasticsearchClient } from '@kbn/core/server';
import type { UsageCounters } from '../../../common/types';

import {
  serializeCounterKey,
  type UsageCountersSavedObjectAttributes,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
} from '../..';

// domainId, counterName, counterType, source, count, namespace?
export type CounterAttributes = [
  string,
  string,
  string,
  UsageCounters.v1.CounterEventSource,
  number,
  string?
];

export function toCounterMetric(counter: CounterAttributes): UsageCounters.v1.CounterMetric {
  const [domainId, counterName, counterType, source, incrementBy, namespace] = counter;
  return { domainId, counterName, counterType, source, incrementBy, namespace };
}

export async function createCounters(
  internalRepository: ISavedObjectsRepository,
  esClient: ElasticsearchClient,
  isoDate: string,
  counters: UsageCounters.v1.CounterMetric[]
) {
  await Promise.all(
    counters
      .map((counter) => createCounterObject(isoDate, counter))
      .map((counter) => incrementCounter(internalRepository, counter))
  );

  // we manually update the 'updated_at' property of the SOs, to simulate older counters
  await modifyUpdatedAt(
    esClient,
    counters.map((counter) =>
      serializeCounterKey({
        ...counter,
        // SOR injects '[namespace:]so_type:' prefix when generating the ID
        domainId: `${USAGE_COUNTERS_SAVED_OBJECT_TYPE}:${counter.domainId}`,
        date: isoDate,
      })
    ),
    isoDate
  );
}

function createCounterObject(
  date: string,
  counter: UsageCounters.v1.CounterMetric
): SavedObject<UsageCountersSavedObjectAttributes> {
  const { domainId, counterName, counterType, namespace, source, incrementBy } = counter;
  const id = serializeCounterKey({
    domainId,
    counterName,
    counterType,
    source,
    date,
  });
  return {
    type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    id,
    ...(namespace && { namespaces: [namespace] }),
    // updated_at: date // illustrative purpose only, overriden by SOR
    attributes: {
      domainId,
      counterName,
      counterType,
      source,
      count: incrementBy,
    },
    references: [],
  };
}

async function incrementCounter(
  internalRepository: ISavedObjectsRepository,
  counter: SavedObject<UsageCountersSavedObjectAttributes>
) {
  const namespace = counter.namespaces?.[0];
  return await internalRepository.incrementCounter(
    USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    counter.id,
    [{ fieldName: 'count', incrementBy: counter.attributes.count }],
    {
      ...(namespace && { namespace }),
      upsertAttributes: {
        domainId: counter.attributes.domainId,
        counterName: counter.attributes.counterName,
        counterType: counter.attributes.counterType,
        source: counter.attributes.source,
      },
    }
  );
}

async function modifyUpdatedAt(esClient: ElasticsearchClient, ids: string[], updatedAt: string) {
  await esClient.updateByQuery({
    index: USAGE_COUNTERS_SAVED_OBJECT_INDEX,
    query: {
      ids: {
        values: ids,
      },
    },
    refresh: true,
    script: {
      lang: 'painless',
      params: { updatedAt },
      source: `ctx._source.updated_at = params.updatedAt;`,
    },
  });
}
