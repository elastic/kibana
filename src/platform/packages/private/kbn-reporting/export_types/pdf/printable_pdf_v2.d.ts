import type { RunTaskOpts } from '@kbn/reporting-server';
import type { TaskRunResult } from '@kbn/reporting-common/types';
import type { TaskPayloadPDFV2, JobParamsPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import { ExportType } from '@kbn/reporting-server';
export declare class PdfExportType extends ExportType<JobParamsPDFV2, TaskPayloadPDFV2> {
    id: string;
    name: string;
    jobType: string;
    jobContentEncoding: "base64";
    jobContentExtension: "pdf";
    validLicenses: ("standard" | "gold" | "platinum" | "enterprise" | "trial")[];
    constructor(...args: ConstructorParameters<typeof ExportType>);
    /**
     * @param JobParamsPDFV2
     * @returns jobParams
     */
    createJob: ({ locatorParams, ...jobParams }: JobParamsPDFV2) => Promise<{
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
    runTask: ({ jobId, payload, request, taskInstanceFields, cancellationToken, stream, }: RunTaskOpts<TaskPayloadPDFV2>) => Promise<TaskRunResult>;
}
