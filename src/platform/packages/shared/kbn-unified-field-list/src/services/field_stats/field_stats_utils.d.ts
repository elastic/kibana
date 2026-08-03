import type { estypes } from '@elastic/elasticsearch';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { FieldStatsResponse } from '../../types';
export type SearchHandler = ({ aggs, fields, size, }: {
    aggs?: Record<string, estypes.AggregationsAggregationContainer>;
    fields?: object[];
    size?: number;
}) => Promise<estypes.SearchResponse<unknown>>;
export declare function buildSearchParams({ dataViewPattern, timeFieldName, fromDate, toDate, dslQuery, runtimeMappings, aggs, fields, size, }: {
    dataViewPattern: string;
    timeFieldName?: string;
    fromDate: string;
    toDate: string;
    dslQuery: object;
    runtimeMappings: estypes.MappingRuntimeFields;
    aggs?: Record<string, estypes.AggregationsAggregationContainer>;
    fields?: object[];
    size?: number;
}): {
    index: string;
    query: {
        bool: {
            filter: object[];
        };
    };
    aggs: Record<string, estypes.AggregationsAggregationContainer> | undefined;
    fields: object[] | undefined;
    runtime_mappings: estypes.MappingRuntimeFields;
    _source: boolean | undefined;
    track_total_hits: boolean;
    size: number;
};
export declare function fetchAndCalculateFieldStats({ searchHandler, dataView, field, fromDate, toDate, size, }: {
    searchHandler: SearchHandler;
    dataView: DataView;
    field: DataViewField;
    fromDate: string;
    toDate: string;
    size?: number;
}): Promise<FieldStatsResponse<string | number>>;
export declare function getNumberSummary(aggSearchWithBody: SearchHandler, field: DataViewField): Promise<FieldStatsResponse<string | number>>;
export declare function getNumberHistogram(aggSearchWithBody: SearchHandler, field: DataViewField, useTopHits?: boolean): Promise<FieldStatsResponse<string | number>>;
export declare function getStringSamples(aggSearchWithBody: SearchHandler, field: DataViewField, size?: number): Promise<FieldStatsResponse<string | number>>;
export declare function getDateHistogram(aggSearchWithBody: SearchHandler, field: DataViewField, range: {
    fromDate: string;
    toDate: string;
}): Promise<FieldStatsResponse<string | number>>;
export declare function getSimpleExamples(search: SearchHandler, field: DataViewField, dataView: DataView, formatter?: FieldFormat): Promise<FieldStatsResponse<string | number>>;
export declare function getGeoExamples(search: SearchHandler, field: DataViewField, dataView: DataView): Promise<FieldStatsResponse<string | number>>;
export declare function sumSampledValues(topValues: FieldStatsResponse<string | number>['topValues'], sumOtherDocCount: number): number;
