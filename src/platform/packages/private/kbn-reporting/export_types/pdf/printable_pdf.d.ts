import type { LicenseType } from '@kbn/licensing-types';
import type { TaskRunResult } from '@kbn/reporting-common/types';
import type { JobParamsPDFDeprecated, TaskPayloadPDF } from '@kbn/reporting-export-types-pdf-common';
import type { RunTaskOpts } from '@kbn/reporting-server';
import { ExportType } from '@kbn/reporting-server';
/**
 * @deprecated
 */
export declare class PdfV1ExportType extends ExportType<JobParamsPDFDeprecated, TaskPayloadPDF> {
    id: string;
    name: string;
    jobType: string;
    jobContentEncoding?: "base64";
    jobContentExtension: "pdf";
    validLicenses: LicenseType[];
    constructor(...args: ConstructorParameters<typeof ExportType>);
    createJob: ({ relativeUrls, ...jobParams }: JobParamsPDFDeprecated) => Promise<{
        isDeprecated: boolean;
        forceNow: string;
        objects: {
            relativeUrl: string;
        }[];
        layout: import("@kbn/screenshotting-plugin/common").LayoutParams;
        browserTimezone: string;
        objectType: string;
        title: string;
        version: string;
        pagingStrategy?: import("@kbn/reporting-common/types").CsvPagingStrategy;
    }>;
    runTask: ({ jobId, payload: job, request, taskInstanceFields, cancellationToken, stream, }: RunTaskOpts<TaskPayloadPDF>) => Promise<TaskRunResult>;
}
