import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import type { CsvPagingStrategy } from '@kbn/reporting-common/types';
import type { JobParamsCSV, TaskPayloadCSV } from '@kbn/reporting-export-types-csv-common';
import type { BaseExportTypeSetupDeps, BaseExportTypeStartDeps, RunTaskOpts } from '@kbn/reporting-server';
import { ExportType } from '@kbn/reporting-server';
type CsvSearchSourceExportTypeSetupDeps = BaseExportTypeSetupDeps;
interface CsvSearchSourceExportTypeStartDeps extends BaseExportTypeStartDeps {
    data: DataPluginStart;
    discover: DiscoverServerPluginStart;
}
export declare class CsvSearchSourceExportType extends ExportType<JobParamsCSV, TaskPayloadCSV, CsvSearchSourceExportTypeSetupDeps, CsvSearchSourceExportTypeStartDeps> {
    id: string;
    name: string;
    jobType: string;
    jobContentEncoding: "base64";
    jobContentExtension: "csv";
    validLicenses: ("basic" | "standard" | "gold" | "platinum" | "enterprise" | "trial")[];
    constructor(...args: ConstructorParameters<typeof ExportType>);
    createJob: (jobParams: JobParamsCSV) => Promise<{
        searchSource: import("@kbn/data-plugin/public").SerializedSearchSourceFields;
        columns?: string[];
        browserTimezone: string;
        objectType: string;
        title: string;
        version: string;
        forceNow?: string;
        layout?: import("@kbn/screenshotting-plugin/common").LayoutParams;
        pagingStrategy: CsvPagingStrategy;
    }>;
    runTask: ({ jobId, payload: job, taskInstanceFields, request, cancellationToken, stream, useInternalUser, }: RunTaskOpts<TaskPayloadCSV>) => Promise<import("@kbn/reporting-common/types").TaskRunResult>;
}
export {};
