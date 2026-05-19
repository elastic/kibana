import type { SerializableRecord } from '@kbn/utility-types';
import type { AggParamsMapping, AggConfigSerialized, SerializedSearchSourceFields, METRIC_TYPES, BUCKET_TYPES } from '@kbn/data-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { VisParams } from '@kbn/visualizations-common';
export type SavedVisState<TVisParams = SerializableRecord> = {
    title: string;
    type: string;
    params: TVisParams;
    aggs: AggConfigSerialized[];
};
export type { VisualizationSavedObjectAttributes, VisualizationSavedObject, } from './content_management';
export interface SerializedVisData {
    expression?: string;
    aggs: AggConfigSerialized[];
    searchSource: SerializedSearchSourceFields;
    savedSearchId?: string;
}
export interface SerializedVis<T = VisParams> {
    id?: string;
    title: string;
    description?: string;
    type: string;
    params: T;
    uiState?: any;
    data: SerializedVisData;
}
interface SchemaConfigParams {
    precision?: number;
    useGeocentroid?: boolean;
}
export type SupportedAggregation = METRIC_TYPES | BUCKET_TYPES;
type SchemasByAggs<Aggs extends SupportedAggregation> = {
    [Agg in Aggs]: GenericSchemaConfig<Agg>;
}[Aggs];
export interface GenericSchemaConfig<Agg extends SupportedAggregation> {
    accessor: number;
    label: string;
    format: SerializedFieldFormat;
    params: SchemaConfigParams;
    aggType: Agg;
    aggId?: string;
    aggParams?: AggParamsMapping[Agg];
}
export type SchemaConfig<Aggs extends SupportedAggregation = SupportedAggregation> = SchemasByAggs<Aggs>;
