import type { SavedObjectReference } from '@kbn/core-saved-objects-common/src/server_types';
import type { FormBasedLayer, FormBasedPersistedState, GenericIndexPatternColumn, PersistedIndexPatternLayer, TextBasedLayer, TextBasedLayerColumn, TextBasedPersistedState } from '@kbn/lens-common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { type Filter, type Query } from '@kbn/es-query';
import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import type { LensAttributes } from '../types';
import type { LensApiAllOperations, LensApiConfig } from '../schema';
import type { APIAdHocDataView, APIDataView } from './columns/types';
import type { LayerSettingsSchema } from '../schema/shared';
import type { LensApiFilterType } from '../schema/filter';
import type { DataSourceType, DataSourceTypeESQL, DataSourceTypeNoESQL } from '../schema/data_source';
import type { XScaleSchemaType } from '../schema/charts/shared';
export type DataSourceStateLayer = FormBasedPersistedState['layers'] | PersistedIndexPatternLayer | TextBasedPersistedState['layers'][0];
/**
 * Reference name under which an XY by-value annotation layer persists its data
 * view. Must match the name produced by the Lens XY persistence logic
 * (`getLayerReferenceName` in x-pack/.../lens/public/visualizations/xy/persistence.ts),
 * which lives in a plugin this shared package cannot import from.
 */
export declare function getXYAnnotationLayerReferenceName(layerId: string): string;
/**
 * given Lens State layer and column id, returns the corresponding Lens API operation
 * @param columnId
 * @param layer
 * @returns
 */
export declare const operationFromColumn: (columnId: string, layer: Omit<FormBasedLayer, "indexPatternId">) => LensApiAllOperations | undefined;
export declare function isFormBasedLayer(layer: DataSourceStateLayer): layer is Omit<FormBasedLayer, 'indexPatternId'>;
export declare function isTextBasedLayer(layer: DataSourceStateLayer): layer is TextBasedLayer;
export declare function generateAdHocDataViewId(dataView: Pick<APIAdHocDataView, 'index' | 'timeFieldName' | 'esqlQuery' | 'dataSourceType' | 'name' | 'allowHidden' | 'fieldSettings'>): string;
export declare function getAdHocDataViewSpec(dataView: APIAdHocDataView): {
    type?: string | undefined;
    allowHidden?: boolean | undefined;
    allowNoIndex: boolean;
    fieldFormats?: Record<string, import("@kbn/field-formats-plugin/common").SerializedFieldFormat> | undefined;
    runtimeFieldMap?: Record<string, import("@kbn/data-views-plugin/common").RuntimeFieldSpec> | undefined;
    fieldAttrs?: import("@kbn/data-views-plugin/common/types").FieldAttrsAsObject | undefined;
    id: string;
    title: string;
    name: string;
    timeFieldName: string | undefined;
    sourceFilters: never[];
};
export declare const getAdhocDataviews: (dataviews: Record<string, APIDataView | APIAdHocDataView>, annotationLayerIds?: ReadonlySet<string>) => {
    adHocDataViews: Record<string, DataViewSpec>;
    internalReferences: SavedObjectReference[];
};
export declare function buildDataSourceStateESQL(layer: TextBasedLayer): DataSourceTypeESQL;
export declare function isDataViewSpec(spec: unknown): spec is DataViewSpec;
export declare function isDataViewSpecWithTitle(spec: unknown): spec is DataViewSpec & {
    title: string;
};
/**
 * Builds the `data_view_spec` data source from an ad-hoc
 * `DataViewSpec`. Shared by data layers and XY annotation layers so both emit an
 * inline data view identically.
 */
export declare function buildDataViewSpecDataSource(dataViewSpec: DataViewSpec & {
    title: string;
}): Extract<DataSourceType, {
    type: typeof AS_CODE_DATA_VIEW_SPEC_TYPE;
}>;
/**
 * Resolves the data view id for a NoESQL layer. The id is taken, in priority
 * order, from an ad hoc reference (`state.internalReferences`), a persisted
 * reference (top-level `references`), or the layer's own inline `indexPatternId`.
 * Data layers and XY annotation layers persist their data view under different
 * reference names, hence the `referenceName` parameter.
 */
export declare function resolveDataViewId(references: SavedObjectReference[], adhocReferences: SavedObjectReference[], referenceName: string, inlineDataViewId?: string): string | undefined;
/**
 * Builds the NoESQL `data_source` for a resolved data view id: an inline
 * `data_view_spec` when the id points at an ad hoc data view, otherwise a
 * `data_view_reference`. Shared by data layers and XY annotation layers so both
 * emit the data view identically.
 *
 * `dataViewId` must be a non-empty id: an empty `ref_id` is not a valid data
 * source, so callers are responsible for resolving the id (or handling its
 * absence) before calling this.
 */
export declare function buildDataViewDataSource(dataViewId: string, adHocDataViews: Record<string, unknown>): DataSourceTypeNoESQL;
export declare function buildDataSourceStateNoESQL(layer: FormBasedLayer | Omit<FormBasedLayer, 'indexPatternId'>, layerId: string, adHocDataViews: Record<string, unknown>, references: SavedObjectReference[], adhocReferences?: SavedObjectReference[], referenceName?: string): DataSourceTypeNoESQL;
/**
 * Builds Data Source State from the layer configuration
 *
 * @deprecated use `buildDatasetStateESQL` or `buildDatasetStateNoESQL` instead
 */
export declare function buildDataSourceState(layer: FormBasedLayer | Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer, layerId: string, adHocDataViews: Record<string, unknown>, references: SavedObjectReference[], adhocReferences?: SavedObjectReference[]): DataSourceType;
/**
 * Builds Lens State data view references from a `{ layerId => dataViewId }` map.
 *
 * Most layers persist their data view under the `indexpattern-datasource-layer-`
 * reference name. By-value XY annotation layers are the exception: their data
 * view must be persisted under the `xy-visualization-layer-` name so the XY
 * runtime can resolve it (otherwise it falls back to the first index-pattern
 * reference and the panel fails to render). Pass those layer ids via
 * `annotationLayerIds` so they get the correct prefix.
 * See x-pack/.../lens/public/visualizations/xy/persistence.ts and
 * https://github.com/elastic/kibana/issues/268821.
 */
export declare function buildReferences(dataviews: Record<string, string>, annotationLayerIds?: ReadonlySet<string>): SavedObjectReference[];
export declare function isSingleLayer(layer: DataSourceStateLayer): layer is PersistedIndexPatternLayer | TextBasedPersistedState['layers'][0];
/**
 * Gets DataView from the DataSource configuration
 *
 * @param dataSource
 * @param dataViewsAPI
 * @returns
 */
export declare function getDataSourceIndex(dataSource: DataSourceType): {
    fieldSettings?: Record<string, Readonly<{
        format?: Readonly<{
            params?: any;
        } & {
            type: string;
        }> | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
    } & {}> | Readonly<{
        script?: string | undefined;
        format?: Readonly<{
            params?: any;
        } & {
            type: string;
        }> | undefined;
        custom_label?: string | undefined;
        custom_description?: string | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
    }> | Readonly<{
        script?: string | undefined;
    } & {
        type: "composite";
        fields: Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
        }>>;
    }>> | undefined;
    allowHidden?: boolean | undefined;
    name?: string | undefined;
    index: string;
    timeFieldName: string;
    esqlQuery?: undefined;
} | {
    index: string;
    timeFieldName: string | undefined;
    esqlQuery: string;
};
/**
 * Builds lens config datasource states from LensApiConfig
 *
 * @param config lens api state
 * @param dataviews list to which dataviews are added
 * @param buildFormulaLayers function used when data_source type is index or dataView
 * @param getValueColumns function used when data_source type is table or esql
 * @param dataViewsAPI dataViews service
 * @returns lens datasource states
 *
 */
export declare const buildDatasourceStates: (config: LensApiConfig, buildDataLayers: (config: unknown, i: number, index: {
    index: string;
    timeFieldName: string | undefined;
}) => PersistedIndexPatternLayer | FormBasedPersistedState["layers"] | undefined, getValueColumns: (config: any, i: number, xAxisScale?: XScaleSchemaType) => TextBasedLayerColumn[]) => {
    layers: LensAttributes["state"]["datasourceStates"];
    usedDataviews: Record<string, APIDataView | APIAdHocDataView>;
};
export declare const addLayerColumn: (layer: PersistedIndexPatternLayer, columnName: string, config: GenericIndexPatternColumn | GenericIndexPatternColumn[], first?: boolean, postfix?: string) => void;
/**
 * Generates the base layer
 *
 * @param id
 * @param options
 * @returns
 */
export declare const generateLayer: (id: string, options: LayerSettingsSchema) => Record<string, PersistedIndexPatternLayer>;
export declare const generateApiLayer: (options: PersistedIndexPatternLayer | TextBasedLayer) => {
    sampling: number;
    ignore_global_filters: boolean;
};
export declare const queryToLensState: (query: LensApiFilterType) => Query;
export declare const filtersAndQueryToApiFormat: (state: LensAttributes) => {
    filters?: AsCodeFilter[];
    query?: LensApiFilterType;
};
export declare const filtersAndQueryToLensState: (state: LensApiConfig, references: SavedObjectReference[]) => {
    query?: Query | {
        esql: string;
    } | undefined;
    references: SavedObjectReference[];
    filters: Filter[];
};
export type DeepMutable<T> = T extends (...args: never[]) => unknown ? T : T extends ReadonlyArray<infer U> ? DeepMutable<U>[] : T extends object ? {
    -readonly [P in keyof T]: DeepMutable<T[P]>;
} : T;
export type DeepPartial<T> = T extends (...args: never[]) => unknown ? T : T extends ReadonlyArray<infer U> ? DeepPartial<U>[] : T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
export declare function nonNullable<T>(v: T): v is NonNullable<T>;
