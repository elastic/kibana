/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { USAGE_COUNTERS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type {
  SavedObject,
  SavedObjectsRepository,
  SavedObjectsServiceSetup,
} from '@kbn/core/server';
import type { UsageCounters } from '../../common';

/**
 * The attributes stored in the UsageCounters' SavedObjects
 */
export interface UsageCountersSavedObjectAttributes extends UsageCounters.v1.AbstractCounter {
  /** Number of times the event has occurred **/
  count: number;
}

/**
 * The structure of the SavedObjects of type "usage-counters"
 */
export type UsageCountersSavedObject = SavedObject<UsageCountersSavedObjectAttributes>;

/** The Saved Objects type for Usage Counters **/
export const USAGE_COUNTERS_SAVED_OBJECT_TYPE = 'usage-counter';

export const registerUsageCountersSavedObjectTypes = (
  savedObjectsSetup: SavedObjectsServiceSetup
) => {
  savedObjectsSetup.registerType({
    name: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    indexPattern: USAGE_COUNTERS_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'single',
    mappings: {
      dynamic: false,
      properties: {
        domainId: { type: 'keyword' },
        counterName: { type: 'keyword' },
        counterType: { type: 'keyword' },
        source: { type: 'keyword' },
        count: { type: 'integer' },
      },
    },
  });

  // DEPRECATED: we keep it just to ensure non-reindex migrations (serverless)
  savedObjectsSetup.registerType({
    name: 'usage-counters',
    hidden: false,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {
        domainId: { type: 'keyword' },
      },
    },
  });
};

/**
 * Parameters to the `serializeCounterKey` method
 * @internal used in kibana_usage_collectors
 */
export interface SerializeCounterKeyParams extends UsageCounters.v1.AbstractCounter {
  /** The date to which serialize the key (defaults to 'now') **/
  date?: moment.MomentInput;
}

/**
 * Generates a key based on the UsageCounter details
 * @internal used in kibana_usage_collectors
 * @param opts {@link SerializeCounterKeyParams}
 */
export const serializeCounterKey = (params: SerializeCounterKeyParams) => {
  const { domainId, counterName, counterType, namespace, source, date } = params;
  const dayDate = moment(date).format('YYYYMMDD');

  if (namespace && namespace !== DEFAULT_NAMESPACE_STRING) {
    // e.g. 'someNamespace:dashboards:viewed:total:ui:20240628'
    return `${namespace}:${domainId}:${counterName}:${counterType}:${source}:${dayDate}`;
  } else {
    // e.g. 'dashboards:viewed:total:ui:20240628'
    return `${domainId}:${counterName}:${counterType}:${source}:${dayDate}`;
  }
};

export interface StoreCounterParams {
  metric: UsageCounters.v1.CounterMetric;
  soRepository: Pick<SavedObjectsRepository, 'incrementCounter'>;
}

export const storeCounter = async ({ metric, soRepository }: StoreCounterParams) => {
  const { namespace, counterName, counterType, domainId, source, incrementBy } = metric;
  // same counter key can be used in different namespaces (no need to make namespace part of the key)
  const key = serializeCounterKey({
    domainId,
    counterName,
    counterType,
    source,
    date: moment.now(),
  });

  return await soRepository.incrementCounter(
    USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    key,
    [{ fieldName: 'count', incrementBy }],
    {
      ...(namespace && { namespace }),
      upsertAttributes: {
        domainId,
        counterName,
        counterType,
        source,
      },
      refresh: false,
    }
  );
};
