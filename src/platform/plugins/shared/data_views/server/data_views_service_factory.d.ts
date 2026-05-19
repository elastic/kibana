import type { Logger, SavedObjectsClientContract, ElasticsearchClient, UiSettingsServiceStart, KibanaRequest, CoreStart } from '@kbn/core/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import { DataViewsService } from '../common';
interface DataViewsServiceFactoryDeps {
    logger: Logger;
    uiSettings: UiSettingsServiceStart;
    fieldFormats: FieldFormatsStart;
    capabilities: CoreStart['capabilities'];
    scriptedFieldsEnabled: boolean;
    rollupsEnabled: boolean;
}
/**
 * Creates a new DataViewsService instance.
 * @param deps - Dependencies required by the DataViewsService
 */
export declare const dataViewsServiceFactory: (deps: DataViewsServiceFactoryDeps) => (savedObjectsClient: SavedObjectsClientContract, elasticsearchClient: ElasticsearchClient, request?: KibanaRequest, byPassCapabilities?: boolean) => Promise<DataViewsService>;
export {};
