/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UsageCounters } from '../../common';
export type IncrementCounterParams = UsageCounters.v1.IncrementCounterParams;

export type { UsageCountersServiceSetup, UsageCountersServiceStart } from './types';
export type { UsageCountersSavedObjectAttributes, UsageCountersSavedObject } from './saved_objects';
export type { IUsageCounter as UsageCounter } from './usage_counter';

export { UsageCountersService } from './usage_counters_service';
export { serializeCounterKey, USAGE_COUNTERS_SAVED_OBJECT_TYPE } from './saved_objects';
