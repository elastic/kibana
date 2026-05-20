import type { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { CommonColumnConverterArgs } from './types';
export declare const getStdDeviationFormula: (aggId: string, fieldName: string, reducedTimeRange?: string) => string | null;
export declare const convertToStdDeviationFormulaColumns: ({ visType, agg, dataView }: CommonColumnConverterArgs<METRIC_TYPES.STD_DEV>, reducedTimeRange?: string) => {
    label: string;
    columnId: string;
    isSplit: boolean;
    filter?: import("@kbn/data-plugin/common").Query | undefined;
    scale?: "ordinal" | "interval" | "ratio" | undefined;
    params: {
        formula?: string;
        isFormulaBroken?: boolean;
        format?: {
            id: string;
            params?: {
                decimals: number;
            };
        };
    };
    customLabel?: boolean | undefined;
    interval?: string | undefined;
    operationType: "formula";
    references: string[];
    dataType: import("@kbn/lens-common").DataType;
    timeShift?: string | undefined;
    timeScale?: import("@kbn/lens-common").TimeScaleUnit | undefined;
    reducedTimeRange?: string | undefined;
    sortingHint?: import("@kbn/lens-common").SortingHint | undefined;
    isBucketed: boolean;
    isStaticValue?: boolean | undefined;
    hasArraySupport?: boolean | undefined;
    meta: import("../..").Meta;
} | null;
