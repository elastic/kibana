import type { ElasticsearchClient, SavedObjectsClientContract, UiSettingsServiceStart } from '@kbn/core/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { DatatableUtilitiesService as DatatableUtilitiesServiceCommon } from '../../common';
import type { AggsStart } from '../search';
export declare class DatatableUtilitiesService {
    private aggs;
    private dataViews;
    private fieldFormats;
    private uiSettings;
    constructor(aggs: AggsStart, dataViews: DataViewsServerPluginStart, fieldFormats: FieldFormatsStart, uiSettings: UiSettingsServiceStart);
    asScopedToClient(savedObjectsClient: SavedObjectsClientContract, elasticsearchClient: ElasticsearchClient): Promise<DatatableUtilitiesServiceCommon>;
}
