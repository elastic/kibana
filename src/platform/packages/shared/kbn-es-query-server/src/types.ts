/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf } from '@kbn/config-schema';
import { Writable } from '@kbn/utility-types';
import { timeRangeSchema, absoluteTimeRangeSchema, relativeTimeRangeSchema } from './time_range';

export type TimeRange = Writable<TypeOf<typeof timeRangeSchema>>;
export type AbsoluteTimeRange = TypeOf<typeof absoluteTimeRangeSchema>;
export type RelativeTimeRange = TypeOf<typeof relativeTimeRangeSchema>;
