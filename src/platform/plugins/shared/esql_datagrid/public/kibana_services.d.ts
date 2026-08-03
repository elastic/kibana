import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
export declare let core: CoreStart;
interface ServiceDeps {
    core: CoreStart;
    data: DataPublicPluginStart;
    uiActions: UiActionsStart;
    fieldFormats: FieldFormatsStart;
    share?: SharePluginStart;
}
export declare const untilPluginStartServicesReady: () => Promise<ServiceDeps>;
export declare const setKibanaServices: (kibanaCore: CoreStart, data: DataPublicPluginStart, uiActions: UiActionsStart, fieldFormats: FieldFormatsStart, share?: SharePluginStart) => void;
export {};
