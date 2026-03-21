import type { TypeOf } from '@kbn/config-schema';
import type { Writable } from '@kbn/utility-types';
import type { serializedTitlesSchema } from './titles_schema';
import type { serializedTimeRangeSchema } from './time_range_schema';
export type SerializedTimeRange = Writable<TypeOf<typeof serializedTimeRangeSchema>>;
export type SerializedTitles = Writable<TypeOf<typeof serializedTitlesSchema>>;
