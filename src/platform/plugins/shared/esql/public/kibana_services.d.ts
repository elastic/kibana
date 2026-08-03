import type { CoreStart, DocLinksStart } from '@kbn/core/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { EsqlPluginStart } from './plugin';
export declare let core: CoreStart;
export interface ServiceDeps {
    core: CoreStart;
    data: DataPublicPluginStart;
    storage: Storage;
    uiActions: UiActionsStart;
    fieldsMetadata?: FieldsMetadataPublicStart;
    usageCollection?: UsageCollectionStart;
    cps?: CPSPluginStart;
    esql: EsqlPluginStart;
    docLinks: DocLinksStart;
    kql: KqlPluginStart;
}
export declare function useKibanaServices(): ServiceDeps | undefined;
export declare const untilPluginStartServicesReady: () => Promise<ServiceDeps>;
export declare const setKibanaServices: (esql: EsqlPluginStart, kibanaCore: CoreStart, data: DataPublicPluginStart, storage: Storage, uiActions: UiActionsStart, kql: KqlPluginStart, fieldsMetadata?: FieldsMetadataPublicStart, usageCollection?: UsageCollectionStart, cps?: CPSPluginStart) => void;
