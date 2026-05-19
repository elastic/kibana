import type { AggParamsDateHistogram } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DateHistogramParams } from '../../types';
import type { DateHistogramColumn } from './types';
export declare const getLabel: (aggParams: AggParamsDateHistogram, fieldName: string) => string;
export declare const convertToDateHistogramParams: (aggParams: AggParamsDateHistogram, dropEmptyRowsInDateHistogram: boolean) => DateHistogramParams;
export declare const convertToDateHistogramColumn: (aggId: string, aggParams: AggParamsDateHistogram, dataView: DataView, isSplit: boolean, dropEmptyRowsInDateHistogram: boolean) => DateHistogramColumn | null;
