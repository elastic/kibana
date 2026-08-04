import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { UnifiedHistogramBucketInterval } from '../../../types';
/**
 * Convert the response from the chart request into a format that can be used
 * by the Unified Histogram chart. The returned object should be used to update
 * time range interval of histogram.
 */
export declare const buildBucketInterval: ({ data, dataView, timeInterval, timeRange, response, }: {
    data: DataPublicPluginStart;
    dataView: DataView;
    timeInterval?: string;
    timeRange: TimeRange;
    response?: SearchResponse;
}) => UnifiedHistogramBucketInterval | undefined;
