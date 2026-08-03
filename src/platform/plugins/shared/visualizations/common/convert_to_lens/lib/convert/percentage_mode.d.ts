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
    filter?: import("@kbn/es-query").Query | undefined;
    customLabel?: boolean | undefined;
    scale?: "ordinal" | "interval" | "ratio" | undefined;
    interval?: string | undefined;
    references: string[];
    dataType: import("@kbn/lens-common").DataType;
    timeShift?: string | undefined;
    operationType: "formula";
    timeScale?: import("@kbn/lens-common").TimeScaleUnit | undefined;
    reducedTimeRange?: string | undefined;
    sortingHint?: import("@kbn/lens-common").SortingHint | undefined;
    isBucketed: boolean;
    isStaticValue?: boolean | undefined;
    hasArraySupport?: boolean | undefined;
    label?: string;
    meta: import("../..").Meta;
} | null;
