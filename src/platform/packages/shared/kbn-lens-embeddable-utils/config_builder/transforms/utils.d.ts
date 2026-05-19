import type { SavedObjectReference } from '@kbn/core-saved-objects-common/src/server_types';
import type { FormBasedLayer, FormBasedPersistedState, GenericIndexPatternColumn, PersistedIndexPatternLayer, TextBasedLayer, TextBasedLayerColumn, TextBasedPersistedState } from '@kbn/lens-common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { type Filter, type Query } from '@kbn/es-query';
import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import type { LensAttributes } from '../types';
import type { LensApiAllOperations, LensApiConfig } from '../schema';
import type { APIAdHocDataView, APIDataView } from './columns/types';
import type { LayerSettingsSchema } from '../schema/shared';
import type { LensApiFilterType } from '../schema/filter';
import type { DataSourceType, DataSourceTypeESQL, DataSourceTypeNoESQL } from '../schema/data_source';
import type { XScaleSchemaType } from '../schema/charts/shared';
export type DataSourceStateLayer = FormBasedPersistedState['layers'] | PersistedIndexPatternLayer | TextBasedPersistedState['layers'][0];
export declare function createDataViewReference(index: string, layerId: string): SavedObjectReference;
export declare const getDefaultReferences: (index: string, dataLayerId: string) => SavedObjectReference[];
/**
 * given Lens State layer and column id, returns the corresponding Lens API operation
 * @param columnId
 * @param layer
 * @returns
 */
export declare const operationFromColumn: (columnId: string, layer: Omit<FormBasedLayer, "indexPatternId">) => LensApiAllOperations | undefined;
export declare function isFormBasedLayer(layer: DataSourceStateLayer): layer is Omit<FormBasedLayer, 'indexPatternId'>;
export declare function isTextBasedLayer(layer: LensApiConfig | DataSourceStateLayer): layer is TextBasedLayer;
export declare function generateAdHocDataViewId(dataView: Pick<APIAdHocDataView, 'index' | 'timeFieldName' | 'esqlQuery' | 'dataSourceType'>): string;
export declare const getAdhocDataviews: (dataviews: Record<string, APIDataView | APIAdHocDataView>) => {
    adHocDataViews: Record<string, DataViewSpec>;
    internalReferences: SavedObjectReference[];
};
export declare function buildDataSourceStateESQL(layer: TextBasedLayer): DataSourceTypeESQL;
export declare function isDataViewSpec(spec: unknown): spec is DataViewSpec;
export declare function buildDataSourceStateNoESQL(layer: FormBasedLayer | Omit<FormBasedLayer, 'indexPatternId'>, layerId: string, adHocDataViews: Record<string, unknown>, references: SavedObjectReference[], adhocReferences?: SavedObjectReference[]): DataSourceTypeNoESQL;
/**
 * Builds Data Source State from the layer configuration
 *
 * @deprecated use `buildDatasetStateESQL` or `buildDatasetStateNoESQL` instead
 */
export declare function buildDataSourceState(layer: FormBasedLayer | Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer, layerId: string, adHocDataViews: Record<string, unknown>, references: SavedObjectReference[], adhocReferences?: SavedObjectReference[]): DataSourceType;
export declare function buildReferences(dataviews: Record<string, string>): SavedObjectReference[];
export declare function isSingleLayer(layer: DataSourceStateLayer): layer is PersistedIndexPatternLayer | TextBasedPersistedState['layers'][0];
/**
 * Gets DataView from the DataSource configuration
 *
 * @param dataSource
 * @param dataViewsAPI
 * @returns
 */
export declare function getDataSourceIndex(dataSource: DataSourceType): {
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
