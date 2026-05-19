import { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { MinMax } from '../../types';
import type { ExtendedColumnConverterArgs } from './types';
export declare const convertToColumnInPercentageMode: (columnConverterArgs: ExtendedColumnConverterArgs<METRIC_TYPES>, minMax: MinMax | {}) => {
    params: {
        format: {
            id: string;
        };
        formula?: string;
        isFormulaBroken?: boolean;
    };
    columnId: string;
    isSplit: boolean;
    filter?: import("@kbn/data-plugin/common").Query | undefined;
    interval?: string | undefined;
    scale?: "ordinal" | "interval" | "ratio" | undefined;
    references: string[];
    dataType: import("@kbn/lens-common").DataType;
    operationType: "formula";
    customLabel?: boolean | undefined;
    timeShift?: string | undefined;
    timeScale?: import("@kbn/lens-common").TimeScaleUnit | undefined;
    reducedTimeRange?: string | undefined;
    sortingHint?: import("@kbn/lens-common").SortingHint | undefined;
    isBucketed: boolean;
    isStaticValue?: boolean | undefined;
    hasArraySupport?: boolean | undefined;
    label?: string;
    meta: import("../../types").Meta;
} | null;
