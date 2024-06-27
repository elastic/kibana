/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { USAGE_COUNTERS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type {
  SavedObject,
  SavedObjectsRepository,
  SavedObjectsServiceSetup,
} from '@kbn/core/server';
import moment from 'moment';
import { UsageCounters } from '../../common/types';

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
  /** Number of times the event has occurred **/
  count: number;
}

/**
 * The structure of the SavedObjects of type "usage-counters"
 */
export type UsageCountersSavedObject = SavedObject<UsageCountersSavedObjectAttributes>;

/** The Saved Objects type for Usage Counters **/
export const SERVER_COUNTERS_SAVED_OBJECT_TYPE = 'server-counters';
export const UI_COUNTERS_SAVED_OBJECT_TYPE = 'ui-counters';
export type UsageCounterSavedObjectType = 'server-counters' | 'ui-counters';
export const USAGE_COUNTERS_SAVED_OBJECT_TYPES = [
  SERVER_COUNTERS_SAVED_OBJECT_TYPE,
  UI_COUNTERS_SAVED_OBJECT_TYPE,
];

export const registerUsageCountersSavedObjectTypes = (
  savedObjectsSetup: SavedObjectsServiceSetup
) => {
  savedObjectsSetup.registerType({
    indexPattern: USAGE_COUNTERS_SAVED_OBJECT_INDEX,
    name: SERVER_COUNTERS_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'single',
    mappings: {
      dynamic: false,
      properties: {
        domainId: { type: 'keyword' },
        counterName: { type: 'keyword' },
        counterType: { type: 'keyword' },
      },
    },
  });

  savedObjectsSetup.registerType({
    indexPattern: USAGE_COUNTERS_SAVED_OBJECT_INDEX,
    name: UI_COUNTERS_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'single',
    mappings: {
      dynamic: false,
      properties: {
        domainId: { type: 'keyword' },
        counterName: { type: 'keyword' },
        counterType: { type: 'keyword' },
      },
    },
  });
};

/**
 * Parameters to the `serializeCounterKey` method
 * @internal used in kibana_usage_collectors
 */
export interface SerializeCounterParams {
  /** The domain ID registered in the UsageCounter **/
  domainId: string;
  /** The counter name **/
  counterName: string;
  /** The counter type **/
  counterType: string;
  /** The date to which serialize the key **/
  date: moment.MomentInput;
  /** The namespace of this counter (optional) */
  namespace?: string;
}

/**
 * Generates a key based on the UsageCounter details
 * @internal used in kibana_usage_collectors
 * @param opts {@link SerializeCounterParams}
 */
export const serializeCounterKey = ({
  domainId,
  counterName,
  counterType,
  date,
  namespace,
}: SerializeCounterParams) => {
  const dayDate = moment(date).format('DDMMYYYY');
  return `${domainId}:${dayDate}:${counterType}:${counterName}${namespace ? `:${namespace}` : ''}`;
};

export interface StoreCounterParams {
  metric: UsageCounters.v1.CounterMetric;
  soRepository: Pick<SavedObjectsRepository, 'incrementCounter'>;
  soType: UsageCounterSavedObjectType;
}

export const storeCounter = async ({ metric, soRepository, soType }: StoreCounterParams) => {
  const { namespace, counterName, counterType, domainId, incrementBy } = metric;
  const key = serializeCounterKey({
    date: moment.now(),
    domainId,
    counterName,
    counterType,
  });

  return await soRepository.incrementCounter(soType, key, [{ fieldName: 'count', incrementBy }], {
    namespace,
    upsertAttributes: {
      domainId,
      counterName,
      counterType,
    },
  });
};
