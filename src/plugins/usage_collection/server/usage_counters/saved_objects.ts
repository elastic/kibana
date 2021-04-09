/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObject,
  SavedObjectsRepository,
  SavedObjectAttributes,
  SavedObjectsServiceSetup,
} from 'kibana/server';
import moment from 'moment';
import { CounterMetric } from './usage_counter';

export interface UsageCountersSavedObjectAttributes extends SavedObjectAttributes {
  count: number;
}

export type UsageCountersSavedObject = SavedObject<UsageCountersSavedObjectAttributes>;

export const USAGE_COUNTERS_SAVED_OBJECT_TYPE = 'usage-counters';

export const registerUsageCountersSavedObjectType = (
  savedObjectsSetup: SavedObjectsServiceSetup
) => {
  savedObjectsSetup.registerType({
    name: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    mappings: {
      properties: {
        count: { type: 'integer' },
      },
    },
  });
};

export interface SerializeCounterParams {
  domainId: string;
  counterName: string;
  counterType: string;
  date: moment.MomentInput;
}

export const serializeCounterKey = ({
  domainId,
  counterName,
  counterType,
  date,
}: SerializeCounterParams) => {
  const dayDate = moment(date).format('DDMMYYYY');
  return `${domainId}:${dayDate}:${counterType}:${counterName}`;
};

export const deserializeCounterKey = (key: string) => {
  const [domainId, , counterType, ...restKey] = key.split(':');
  const counterName = restKey.join(':');

  return {
    domainId,
    counterName,
    counterType,
  };
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

  return await internalRepository.incrementCounter(USAGE_COUNTERS_SAVED_OBJECT_TYPE, key, [
    { fieldName: 'count', incrementBy },
  ]);
};
