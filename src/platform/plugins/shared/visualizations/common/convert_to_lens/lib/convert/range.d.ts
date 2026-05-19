import type { AggParamsRange, AggParamsHistogram } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { RangeParams } from '../../types';
import type { RangeColumn } from './types';
export declare const convertToRangeParams: (aggParams: AggParamsRange | AggParamsHistogram) => RangeParams;
export declare const convertToRangeColumn: (aggId: string, aggParams: AggParamsRange | AggParamsHistogram, label: string, dataView: DataView, isSplit?: boolean) => RangeColumn | null;
