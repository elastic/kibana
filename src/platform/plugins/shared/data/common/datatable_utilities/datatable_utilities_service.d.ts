import type { DataView, DataViewsContract, DataViewField } from '@kbn/data-views-plugin/common';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldFormatsStartCommon, FieldFormat } from '@kbn/field-formats-plugin/common';
import type { AggsCommonStart, AggConfig } from '../search';
import type { TimeRange } from '../types';
interface DateHistogramMeta {
    interval?: string;
    timeZone?: string;
    timeRange?: TimeRange;
}
export declare class DatatableUtilitiesService {
    private aggs;
    private dataViews;
    private fieldFormats;
    constructor(aggs: AggsCommonStart, dataViews: DataViewsContract, fieldFormats: FieldFormatsStartCommon);
    clearField(column: DatatableColumn): void;
    clearFieldFormat(column: DatatableColumn): void;
    getAggConfig(column: DatatableColumn): Promise<AggConfig | undefined>;
    /**
     * Helper function returning the used interval, used time zone and applied time filters for data table column created by the date_histogramm agg type.
     * "auto" will get expanded to the actually used interval.
     * If the column is not a column created by a date_histogram aggregation of the esaggs data source,
     * this function will return undefined.
     */
    getDateHistogramMeta(column: DatatableColumn, defaults?: Partial<{
        timeZone: string;
    }>): DateHistogramMeta | undefined;
    getDataView(column: DatatableColumn): Promise<DataView | undefined>;
    getField(column: DatatableColumn): Promise<DataViewField | undefined>;
    getFieldFormat(column: DatatableColumn): FieldFormat | undefined;
    getInterval(column: DatatableColumn): string | undefined;
    /**
     * Helper function returning the used interval for data table column created by the histogramm agg type.
     * "auto" will get expanded to the actually used interval.
     * If the column is not a column created by a histogram aggregation of the esaggs data source,
     * this function will return undefined.
     */
    getNumberHistogramInterval(column: DatatableColumn): number | undefined;
    getTotalCount(table: Datatable): number | undefined;
    hasPrecisionError(column: DatatableColumn): import("@kbn/utility-types").Serializable;
    isFilterable(column: DatatableColumn): boolean;
    setFieldFormat(column: DatatableColumn, fieldFormat: FieldFormat): void;
}
export {};
