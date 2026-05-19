import type { KibanaRequest } from '@kbn/core/server';
import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import type { JobParamsCsvFromSavedObject, TaskPayloadCsvFromSavedObject } from '@kbn/reporting-export-types-csv-common';
import type { RunTaskOpts } from '@kbn/reporting-server';
import { ExportType, type BaseExportTypeSetupDeps, type BaseExportTypeStartDeps } from '@kbn/reporting-server';
import type { ReportingRequestHandlerContext } from './types';
type CsvV2ExportTypeSetupDeps = BaseExportTypeSetupDeps;
export interface CsvV2ExportTypeStartDeps extends BaseExportTypeStartDeps {
    discover: DiscoverServerPluginStart;
    data: DataPluginStart;
}
export declare class CsvV2ExportType extends ExportType<JobParamsCsvFromSavedObject, TaskPayloadCsvFromSavedObject, CsvV2ExportTypeSetupDeps, CsvV2ExportTypeStartDeps> {
    id: string;
    name: string;
    jobType: string;
    jobContentEncoding: "base64";
    jobContentExtension: "csv";
    validLicenses: ("basic" | "standard" | "gold" | "platinum" | "enterprise" | "trial")[];
    constructor(...args: ConstructorParameters<typeof ExportType>);
    createJob: (jobParams: JobParamsCsvFromSavedObject, _context: ReportingRequestHandlerContext, req: KibanaRequest) => Promise<{
        title: string;
        objectType: "search";
        pagingStrategy: "scroll" | "pit";
        version: string;
        layout?: import("@kbn/screenshotting-plugin/common").LayoutParams | undefined;
        locatorParams: import("@kbn/reporting-common/url").LocatorParams[];
        forceNow?: string | undefined;
        browserTimezone: string;
    }>;
    runTask: ({ jobId, payload: job, request, taskInstanceFields, cancellationToken, stream, }: RunTaskOpts<TaskPayloadCsvFromSavedObject>) => Promise<import("@kbn/reporting-common/types").TaskRunResult>;
}
export {};
