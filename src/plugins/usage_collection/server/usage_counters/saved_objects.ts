/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { USAGE_COUNTERS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type {
  SavedObject,
  SavedObjectsRepository,
  SavedObjectsServiceSetup,
} from '@kbn/core/server';
import { UsageCounters } from '../../common';

/**
 * The attributes stored in the UsageCounters' SavedObjects
 */
export interface UsageCountersSavedObjectAttributes {
  /** The domain ID registered in the Usage Counter **/
  domainId: string;
  /** The counter name **/
  counterName: string;
  /** The counter type **/
  counterType: string;
  /** The source of the event that is being counted: 'server' | 'ui' **/
  source: string;
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
export interface SerializeCounterKeyParams {
  /** The domain ID registered in the UsageCounter **/
  domainId: string;
  /** The counter name **/
  counterName: string;
  /** The counter type **/
  counterType: string;
  /** The namespace of this counter */
  namespace?: string;
  /** The source of the event we are counting */
  source: string;
  /** The date to which serialize the key (defaults to 'now') **/
  date?: moment.MomentInput;
}

/**
 * Generates a key based on the UsageCounter details
 * @internal used in kibana_usage_collectors
 * @param opts {@link SerializeCounterKeyParams}
 */
export const serializeCounterKey = ({
  domainId,
  counterName,
  counterType,
  namespace,
  source,
  date,
}: SerializeCounterKeyParams) => {
  const dayDate = moment(date).format('YYYYMMDD');
  // e.g. 'dashboards:viewed:total:ui:20240628'          // namespace-agnostic counters
  // e.g. 'dashboards:viewed:total:ui:20240628:default'  // namespaced counters
  const namespaceSuffix = namespace ? `:${namespace}` : '';
  return `${domainId}:${counterName}:${counterType}:${source}:${dayDate}${namespaceSuffix}`;
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
    }
  );
};
