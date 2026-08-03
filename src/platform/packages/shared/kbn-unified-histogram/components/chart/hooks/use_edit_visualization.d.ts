import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { UnifiedHistogramServices } from '../../..';
export declare const useEditVisualization: ({ services, dataView, relativeTimeRange, lensAttributes, isPlainRecord, }: {
    services: UnifiedHistogramServices;
    dataView: DataView;
    relativeTimeRange?: TimeRange;
    lensAttributes?: TypedLensByValueInput["attributes"];
    isPlainRecord?: boolean;
}) => (() => void) | undefined;
