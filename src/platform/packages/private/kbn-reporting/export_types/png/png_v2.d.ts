import type { LicenseType } from '@kbn/licensing-types';
import type { TaskRunResult } from '@kbn/reporting-common/types';
import type { JobParamsPNGV2, TaskPayloadPNGV2 } from '@kbn/reporting-export-types-png-common';
import type { RunTaskOpts } from '@kbn/reporting-server';
import { ExportType } from '@kbn/reporting-server';
export declare class PngExportType extends ExportType<JobParamsPNGV2, TaskPayloadPNGV2> {
    id: string;
    name: string;
    jobType: string;
    jobContentEncoding: "base64";
    jobContentExtension: "png";
    validLicenses: LicenseType[];
    constructor(...args: ConstructorParameters<typeof ExportType>);
    /**
     * @params JobParamsPNGV2
     * @returns jobParams
     */
    createJob: ({ locatorParams, ...jobParams }: JobParamsPNGV2) => Promise<{
        locatorParams: import("@kbn/reporting-common/url").LocatorParams<import("@kbn/utility-types").SerializableRecord>[];
        isDeprecated: boolean;
        browserTimezone: string;
        forceNow: string;
        layout: import("@kbn/screenshotting-plugin/common").LayoutParams;
        objectType: string;
        title: string;
        version: string;
        pagingStrategy?: import("@kbn/reporting-common/types").CsvPagingStrategy;
    }>;
    /**
     *
     * @param jobId
     * @param payload
     * @param cancellationToken
     * @param stream
     */
    runTask: ({ jobId, payload, request, taskInstanceFields, cancellationToken, stream, }: RunTaskOpts<TaskPayloadPNGV2>) => Promise<TaskRunResult>;
}
