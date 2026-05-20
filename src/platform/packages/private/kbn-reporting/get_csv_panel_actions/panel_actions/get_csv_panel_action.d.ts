import type { Observable } from 'rxjs';
import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { type SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { ClientConfigType } from '@kbn/reporting-public/types';
import type { ReportingAPIClient } from '@kbn/reporting-public/reporting_api_client';
export interface PanelActionDependencies {
    data: DataPublicPluginStart;
    licensing: LicensingPluginStart;
}
type StartServices = [
    Pick<CoreStart, 'rendering' | 'application' | 'uiSettings'>,
    PanelActionDependencies,
    unknown
];
interface Params {
    apiClient: ReportingAPIClient;
    csvConfig: ClientConfigType['csv'];
    core: CoreSetup;
    startServices$: Observable<StartServices>;
}
export declare class ReportingCsvPanelAction implements ActionDefinition<EmbeddableApiContext> {
    private isDownloading;
    readonly type = "";
    readonly id = "generateCsvReport";
    private readonly i18nStrings;
    private readonly notifications;
    private readonly apiClient;
    private readonly startServices$;
    constructor({ core, apiClient, startServices$ }: Params);
    getIconType(): string;
    getDisplayName(): string;
    getSharingData(savedSearch: SavedSearch): Promise<{
        getSearchSource: ({ addGlobalTimeFilter, absoluteTime, }: {
            addGlobalTimeFilter?: boolean;
            absoluteTime?: boolean;
        }) => SerializedSearchSourceFields;
        columns: string[];
    }>;
    private isEsqlMode;
    isCompatible: (context: EmbeddableApiContext) => Promise<boolean>;
    private executeGenerate;
    private getDiscoverLocatorParamsForEsqlCSV;
    execute: (context: EmbeddableApiContext) => Promise<void>;
}
export {};
