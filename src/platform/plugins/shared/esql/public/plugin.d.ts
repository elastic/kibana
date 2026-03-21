import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import { EsqlVariablesService } from './variables_service';
interface EsqlPluginSetupDependencies {
    uiActions: UiActionsSetup;
}
interface EsqlPluginStartDependencies {
    uiActions: UiActionsStart;
    fieldsMetadata: FieldsMetadataPublicStart;
    licensing?: LicensingPluginStart;
    usageCollection?: UsageCollectionStart;
    share: SharePluginStart;
    data: DataPublicPluginStart;
    fieldFormats: FieldFormatsStart;
    fileUpload: FileUploadPluginStart;
    kql: KqlPluginStart;
}
export interface EsqlPluginStart {
    variablesService: EsqlVariablesService;
    isServerless: boolean;
}
export declare class EsqlPlugin implements Plugin<{}, EsqlPluginStart> {
    private readonly initContext;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup, { uiActions }: EsqlPluginSetupDependencies): {};
    start(core: CoreStart, { data, uiActions, fieldsMetadata, usageCollection, licensing, fileUpload, fieldFormats, share, kql, }: EsqlPluginStartDependencies): EsqlPluginStart;
    stop(): void;
}
export {};
