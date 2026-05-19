/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type moment from 'moment';
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
export declare const USAGE_COUNTERS_SAVED_OBJECT_TYPE = 'usage-counter';
export declare const registerUsageCountersSavedObjectTypes: (
  savedObjectsSetup: SavedObjectsServiceSetup
) => void;
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
export declare const serializeCounterKey: (params: SerializeCounterKeyParams) => string;
export interface StoreCounterParams {
  metric: UsageCounters.v1.CounterMetric;
  soRepository: Pick<SavedObjectsRepository, 'incrementCounter'>;
}
export declare const storeCounter: ({ metric, soRepository }: StoreCounterParams) => Promise<
  SavedObject<{
    domainId: string;
    counterName: string;
    counterType: string;
    source: UsageCounters.CounterEventSource;
  }>
>;
