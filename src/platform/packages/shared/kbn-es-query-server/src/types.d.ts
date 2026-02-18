import type { TypeOf } from '@kbn/config-schema';
import type { Writable } from '@kbn/utility-types';
import type { timeRangeSchema, absoluteTimeRangeSchema, relativeTimeRangeSchema } from './time_range';
import type { aggregateQuerySchema, querySchema } from './query';
export type TimeRange = Writable<TypeOf<typeof timeRangeSchema>>;
export type AbsoluteTimeRange = TypeOf<typeof absoluteTimeRangeSchema>;
export type RelativeTimeRange = TypeOf<typeof relativeTimeRangeSchema>;
export type Query = Writable<TypeOf<typeof querySchema>>;
export type AggregateQuery = Writable<TypeOf<typeof aggregateQuerySchema>>;
