/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  SavedObject,
  SavedObjectsRepository,
  SavedObjectAttributes,
  SavedObjectsServiceSetup,
} from '@kbn/core/server';
import moment from 'moment';
import type { CounterMetric } from './usage_counter';

/**
 * The attributes stored in the UsageCounters' SavedObjects
 */
export interface UsageCountersSavedObjectAttributes extends SavedObjectAttributes {
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
export const USAGE_COUNTERS_SAVED_OBJECT_TYPE = 'usage-counters';

export const registerUsageCountersSavedObjectType = (
  savedObjectsSetup: SavedObjectsServiceSetup
) => {
  savedObjectsSetup.registerType({
    name: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
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
export interface SerializeCounterParams {
  /** The domain ID registered in the UsageCounter **/
  domainId: string;
  /** The counter name **/
  counterName: string;
  /** The counter type **/
  counterType: string;
  /** The date to which serialize the key **/
  date: moment.MomentInput;
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
}: SerializeCounterParams) => {
  const dayDate = moment(date).format('DDMMYYYY');
  return `${domainId}:${dayDate}:${counterType}:${counterName}`;
};

export const storeCounter = async (
  counterMetric: CounterMetric,
  internalRepository: Pick<SavedObjectsRepository, 'incrementCounter'>
) => {
  const { counterName, counterType, domainId, incrementBy } = counterMetric;
  const key = serializeCounterKey({
    date: moment.now(),
    domainId,
    counterName,
    counterType,
  });

  return await internalRepository.incrementCounter(
    USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    key,
    [{ fieldName: 'count', incrementBy }],
    {
      upsertAttributes: {
        domainId,
        counterName,
        counterType,
      },
    }
  );
};
