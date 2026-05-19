import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ESQLSourceResult } from '@kbn/esql-types';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { CPSPluginStart } from '@kbn/cps/public';
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
    cps?: CPSPluginStart;
    share: SharePluginStart;
    data: DataPublicPluginStart;
    fieldFormats: FieldFormatsStart;
    fileUpload: FileUploadPluginStart;
    kql: KqlPluginStart;
}
export interface EsqlPluginSetup {
    /**
     * Register a function to enrich ES|QL source autocomplete suggestions.
     * Multiple plugins can register enrichers; they are chained in registration order.
     */
    registerSourceEnricher(enricher: (sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]>): void;
}
export interface EsqlPluginStart {
    variablesService: EsqlVariablesService;
    isServerless: boolean;
    enrichSources: (sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]>;
}
export declare class EsqlPlugin implements Plugin<EsqlPluginSetup, EsqlPluginStart> {
    private readonly initContext;
    private readonly sourceEnricherService;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup, { uiActions }: EsqlPluginSetupDependencies): EsqlPluginSetup;
    start(core: CoreStart, { data, uiActions, fieldsMetadata, usageCollection, cps, licensing, fileUpload, fieldFormats, share, kql, }: EsqlPluginStartDependencies): EsqlPluginStart;
    stop(): void;
}
export {};
