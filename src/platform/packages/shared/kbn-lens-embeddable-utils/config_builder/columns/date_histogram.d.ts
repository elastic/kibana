import type { DateHistogramIndexPatternColumn } from '@kbn/lens-common';
export type DateHistogramColumnParams = DateHistogramIndexPatternColumn['params'];
export declare const getHistogramColumn: ({ options, }: {
    options?: Partial<Pick<DateHistogramIndexPatternColumn, "sourceField"> & {
        params: DateHistogramColumnParams;
    }>;
}) => DateHistogramIndexPatternColumn;
