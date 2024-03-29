/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { UsageCounters } from '../../common/types';
export type IncrementCounterParams = UsageCounters.v1.IncrementCounterParams;

export type { UsageCountersServiceSetup } from './usage_counters_service';
export type { UsageCountersSavedObjectAttributes, UsageCountersSavedObject } from './saved_objects';
export type { IUsageCounter as UsageCounter } from './usage_counter';

export { UsageCountersService } from './usage_counters_service';
export type { SerializeCounterParams } from './saved_objects';
export { USAGE_COUNTERS_SAVED_OBJECT_TYPE, serializeCounterKey } from './saved_objects';
