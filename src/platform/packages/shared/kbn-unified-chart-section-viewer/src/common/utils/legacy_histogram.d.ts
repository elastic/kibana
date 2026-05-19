import type { ES_FIELD_TYPES } from '@kbn/field-types';
import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
/**
 * A legacy histogram is a metric where both the ES field type and the
 * metric instrument are histogram.
 */
export declare const isLegacyHistogram: (type: ES_FIELD_TYPES, instrument: MappingTimeSeriesMetricType) => boolean;
