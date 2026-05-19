import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
export declare const getDataViewByIndexPatternId: (indexPatternId: string | undefined, dataViews: DataViewsPublicPluginStart) => Promise<import("@kbn/data-views-plugin/public").DataView | null>;
