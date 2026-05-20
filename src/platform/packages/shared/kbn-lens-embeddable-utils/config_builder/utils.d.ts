import type { SavedObjectReference } from '@kbn/core-saved-objects-common/src/server_types';
import type { DataViewSpec, DataView } from '@kbn/data-views-plugin/public';
import type { FormBasedPersistedState, GenericIndexPatternColumn, PersistedIndexPatternLayer, TextBasedLayerColumn, TextBasedPersistedState } from '@kbn/lens-common';
import type { Reference } from '@kbn/content-management-utils';
import type { DataViewsCommon } from './types';
import type { FormulaValueConfig, LensAttributes, LensBaseConfig, LensBaseLayer, LensBaseXYLayer, LensConfig, LensDataset, LensDataviewDataset } from './types';
import type { LensApiConfig, LensApiConfigESQL, LensApiConfigNoESQL } from './schema';
import type { DataSourceType } from './schema/data_source';
type DataSourceStateLayer = FormBasedPersistedState['layers'] | PersistedIndexPatternLayer | TextBasedPersistedState['layers'][0];
export declare const getDefaultReferences: (index: string, dataLayerId: string) => SavedObjectReference[];
export declare function mapToFormula(layer: LensBaseLayer): FormulaValueConfig;
export declare function extractReferences(dataviews: Record<string, DataView>): {
    references: Reference[];
    internalReferences: Reference[];
    adHocDataViews: Record<string, DataViewSpec>;
};
export declare function buildReferences(dataviews: Record<string, DataView>, adHocDataViews: Record<string, DataViewSpec>): {
    references: Reference[];
    internalReferences: Reference[];
};
export declare const getAdhocDataviews: (dataviews: Record<string, DataView>) => {};
export declare function isSingleLayer(layer: DataSourceStateLayer): layer is PersistedIndexPatternLayer | TextBasedPersistedState['layers'][0];
/**
 * Retrieves an existing data view by its title (index) or creates an Ad-Hoc Dataview if it does not exist.
 *
 * Behavior:
 * - If an explicit `id` is provided, a new ad-hoc data view is picked from the cache or created with that `id`.
 * - If no `id` is provided, the function first attempts to retrieve an existing data view whose id matches `index`.
 *   - If retrieval succeeds, the existing data view is returned.
 *   - If retrieval fails (e.g. it does not exist), a new data view is created using `index` as the title.
 *
 * @param params.index The index pattern or title to use for lookup or creation.
 * @param params.timeFieldName The name of the time field to associate with the data view.
 * @param dataViewsAPI The DataViews service API used to get or create data views.
 * @param id Optional explicit id to assign to the data view; if provided, creation is forced.
 * @returns A promise resolving to the retrieved or newly created data view.
 * @throws Re-throws any error coming from the underlying DataViews API when creation fails.
 */
export declare function getDataView({ index, timeFieldName }: {
    index: string;
    timeFieldName: string;
}, dataViewsAPI: DataViewsCommon, id?: string): Promise<DataView>;
export declare function getDatasetIndex(dataset: LensDataset): {
    index: string;
    timeFieldName: string;
} | undefined;
export declare const buildDatasourceStates: (config: (LensBaseConfig & {
    layers: LensBaseXYLayer[];
}) | (LensBaseLayer & LensBaseConfig), dataviews: Record<string, DataView>, buildFormulaLayers: (config: unknown, i: number, dataView: DataView) => PersistedIndexPatternLayer | FormBasedPersistedState["layers"] | undefined, getValueColumns: (config: any, i: number) => TextBasedLayerColumn[], dataViewsAPI: DataViewsCommon) => Promise<Partial<{
    formBased?: FormBasedPersistedState;
    textBased?: TextBasedPersistedState;
}>>;
export declare const addLayerColumn: (layer: PersistedIndexPatternLayer, columnName: string, config: GenericIndexPatternColumn, first?: boolean) => void;
export declare const addLayerFormulaColumns: (layer: PersistedIndexPatternLayer, columns: PersistedIndexPatternLayer, postfix?: string) => void;
export declare function isDataViewDataset(dataset: LensDataset): dataset is LensDataviewDataset;
export declare function isLensAPIFormat(config: unknown): config is LensApiConfig;
export declare function isLensLegacyFormat(config: unknown): config is LensConfig;
export declare function isLensLegacyAttributes(config: unknown): config is LensAttributes;
export declare function isEsqlTableTypeDataSource(dataSource: DataSourceType): dataSource is Extract<DataSourceType, {
    type: 'esql';
}>;
export declare function groupIsNotCollapsed(def: {
    collapse_by?: string;
}): def is {
    collapse_by: undefined;
};
export declare function isLensESQLConfig(config: LensApiConfig): config is LensApiConfigESQL;
export declare function isLensDSLConfig(config: LensApiConfig): config is LensApiConfigNoESQL;
export {};
