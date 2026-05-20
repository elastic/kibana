import type { IClusterClient } from '@kbn/core-elasticsearch-server';
import type { Headers, HttpServiceSetup, IBasePath, KibanaRequest } from '@kbn/core-http-server';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { PluginInitializerContext } from '@kbn/core-plugins-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { LicenseType } from '@kbn/licensing-types';
import type { Logger } from '@kbn/logging';
import type { ReportingServerInfo } from '@kbn/reporting-common/types';
import type { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { CreateJobFn, RunTaskFn } from './types';
import type { ReportingConfigType } from '.';
export interface BaseExportTypeSetupDeps {
    basePath: Pick<IBasePath, 'set'>;
    spaces?: SpacesPluginSetup;
}
export interface BaseExportTypeStartDeps {
    licensing: LicensingPluginStart;
    savedObjects: SavedObjectsServiceStart;
    uiSettings: UiSettingsServiceStart;
    esClient: IClusterClient;
    screenshotting?: ScreenshottingStart;
}
export declare abstract class ExportType<JobParamsType extends object = any, TaskPayloadType extends object = any, SetupDepsType extends BaseExportTypeSetupDeps = BaseExportTypeSetupDeps, StartDepsType extends BaseExportTypeStartDeps = BaseExportTypeStartDeps> {
    config: ReportingConfigType;
    logger: Logger;
    context: PluginInitializerContext<ReportingConfigType>;
    abstract id: string;
    abstract name: string;
    abstract jobType: string;
    abstract jobContentEncoding?: 'base64' | 'csv';
    abstract jobContentExtension: 'pdf' | 'png' | 'csv';
    abstract createJob: CreateJobFn<JobParamsType, TaskPayloadType>;
    abstract runTask: RunTaskFn<TaskPayloadType>;
    abstract validLicenses: LicenseType[];
    setupDeps: SetupDepsType;
    startDeps: StartDepsType;
    http: HttpServiceSetup;
    isServerless: boolean;
    constructor(core: CoreSetup, config: ReportingConfigType, logger: Logger, context: PluginInitializerContext<ReportingConfigType>);
    setup(setupDeps: SetupDepsType): void;
    start(startDeps: StartDepsType): void;
    getFeatureUsageName(type: string): string;
    shouldNotifyUsage(type: string): boolean;
    notifyUsage(type: string): void;
    private getSavedObjectsClient;
    private getSpaceId;
    protected getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract): import("@kbn/core-ui-settings-server").IUiSettingsClient;
    protected getUiSettingsClient(request: KibanaRequest, logger?: Logger): Promise<import("@kbn/core-ui-settings-server").IUiSettingsClient>;
    protected getFakeRequest(headers: Headers, spaceId: string | undefined, logger?: Logger): KibanaRequest;
    protected getServerInfo(): ReportingServerInfo;
}
