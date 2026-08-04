import type { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { CommonColumnConverterArgs } from './types';
export declare const getStdDeviationFormula: (aggId: string, fieldName: string, reducedTimeRange?: string) => string | null;
export declare const convertToStdDeviationFormulaColumns: ({ visType, agg, dataView }: CommonColumnConverterArgs<METRIC_TYPES.STD_DEV>, reducedTimeRange?: string) => {
    label: string;
    columnId: string;
    isSplit: boolean;
    filter?: import("@kbn/es-query").Query | undefined;
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
    meta: import("../..").Meta;
} | null;
