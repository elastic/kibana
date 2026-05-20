import type { SerializableRecord } from '@kbn/utility-types';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { ExpressionTypeDefinition } from '../types';
export declare enum DimensionType {
    Y_AXIS = "y",
    X_AXIS = "x",
    REFERENCE_LINE = "reference",
    BREAKDOWN = "breakdown",
    MARK_SIZE = "markSize",
    SPLIT_COLUMN = "splitCol",
    SPLIT_ROW = "splitRow"
}
declare const name = "datatable";
/**
 * A Utility function that Typescript can use to determine if an object is a Datatable.
 * @param datatable
 */
export declare const isDatatable: (datatable: unknown) => datatable is Datatable;
/**
 * This type represents the `type` of any `DatatableColumn` in a `Datatable`.
 * its duplicated from KBN_FIELD_TYPES
 */
export type DatatableColumnType = '_source' | 'attachment' | 'boolean' | 'date' | 'geo_point' | 'geo_shape' | 'ip' | 'murmur3' | 'number' | 'string' | 'unknown' | 'conflict' | 'object' | 'nested' | 'histogram' | 'flattened' | 'null';
/**
 * This type represents a row in a `Datatable`.
 */
export type DatatableRow = Record<string, any>;
/**
 * Datatable column meta information
 */
export interface DatatableColumnMeta {
    /**
     * The Kibana normalized type of the column
     */
    type: DatatableColumnType;
    /**
     * The original type of the column from ES
     */
    esType?: string;
    /**
     * field this column is based on
     */
    field?: string;
    /**
     * index/table this column is based on
     */
    index?: string;
    /**
     * i18nized names the domain this column represents
     */
    dimensionName?: string;
    /**
     * types of dimension this column represents
     */
    dimensionType?: string;
    /**
     * serialized field format
     */
    params?: SerializedFieldFormat;
    /**
     * source function that produced this column
     */
    source?: string;
    /**
     * any extra parameters for the source that produced this column
     */
    sourceParams?: SerializableRecord;
}
interface SourceParamsESQL extends Record<string, unknown> {
    indexPattern: string;
    sourceField: string;
    operationType: string;
    interval?: number;
}
export declare function isSourceParamsESQL(obj: Record<string, unknown>): obj is SourceParamsESQL;
/**
 * This type represents the shape of a column in a `Datatable`.
 */
export interface DatatableColumn {
    id: string;
    name: string;
    meta: DatatableColumnMeta;
    isNull?: boolean;
    isComputedColumn?: boolean;
    variable?: string;
}
/**
 * Metadata with statistics about the `Datatable` source.
 */
export interface DatatableMetaStatistics {
    /**
     * Total hits number returned for the request generated the `Datatable`.
     */
    totalCount?: number;
}
/**
 * The `Datatable` meta information.
 */
export interface DatatableMeta {
    /**
     * Statistics about the `Datatable` source.
     */
    statistics?: DatatableMetaStatistics;
    /**
     * The `Datatable` type (e.g. `essql`, `eql`, `esdsl`, etc.).
     */
    type?: string;
    /**
     * The `Datatable` data source.
     */
    source?: string;
    [key: string]: unknown;
}
/**
 * A `Datatable` in Canvas is a unique structure that represents tabulated data.
 */
export interface Datatable {
    type: typeof name;
    columns: DatatableColumn[];
    meta?: DatatableMeta;
    rows: DatatableRow[];
    warning?: string;
}
export interface SerializedDatatable extends Datatable {
    rows: string[][];
}
export declare const datatable: ExpressionTypeDefinition<typeof name, Datatable, SerializedDatatable>;
export {};
