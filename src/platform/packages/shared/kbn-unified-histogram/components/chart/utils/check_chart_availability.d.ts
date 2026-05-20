import { type DataView } from '@kbn/data-views-plugin/common';
import type { UnifiedHistogramChartContext } from '../../../types';
export declare function checkChartAvailability({ chart, dataView, isPlainRecord, }: {
    chart?: UnifiedHistogramChartContext;
    dataView: DataView | undefined;
    isPlainRecord?: boolean;
}): boolean;
