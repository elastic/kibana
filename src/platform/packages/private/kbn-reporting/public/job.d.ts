import React from 'react';
import type { JOB_STATUS } from '@kbn/reporting-common';
import type { BaseParamsV2, JobId, ReportApiJSON, ReportFields, ReportOutput, ReportSource, TaskRunResult } from '@kbn/reporting-common/types';
type ReportPayload = ReportSource['payload'];
export declare class Job {
    readonly payload: Omit<ReportPayload, 'headers'>;
    readonly id: JobId;
    readonly index: string;
    readonly objectType: ReportPayload['objectType'];
    readonly title: ReportPayload['title'];
    readonly isDeprecated: ReportPayload['isDeprecated'];
    readonly spaceId: ReportPayload['spaceId'];
    readonly browserTimezone?: ReportPayload['browserTimezone'];
    readonly layout: ReportPayload['layout'];
    readonly pagingStrategy: ReportPayload['pagingStrategy'];
    readonly version: ReportPayload['version'];
    readonly jobtype: ReportSource['jobtype'];
    readonly created_by: ReportSource['created_by'];
    readonly created_at: ReportSource['created_at'];
    readonly started_at: ReportSource['started_at'];
    readonly completed_at: ReportSource['completed_at'];
    readonly status: JOB_STATUS;
    readonly attempts: ReportSource['attempts'];
    readonly max_attempts: ReportSource['max_attempts'];
    readonly timeout: ReportSource['timeout'];
    readonly kibana_name: ReportSource['kibana_name'];
    readonly kibana_id: ReportSource['kibana_id'];
    readonly size?: ReportOutput['size'];
    readonly content_type?: TaskRunResult['content_type'];
    readonly csv_contains_formulas?: TaskRunResult['csv_contains_formulas'];
    readonly max_size_reached?: TaskRunResult['max_size_reached'];
    readonly metrics?: ReportSource['metrics'];
    readonly warnings?: TaskRunResult['warnings'];
    readonly error_code?: ReportOutput['error_code'];
    readonly locatorParams?: BaseParamsV2['locatorParams'];
    readonly queue_time_ms?: Required<ReportFields>['queue_time_ms'][number];
    readonly execution_time_ms?: Required<ReportFields>['execution_time_ms'][number];
    readonly scheduled_report_id?: ReportSource['scheduled_report_id'];
    constructor(report: ReportApiJSON);
    isSearch(): boolean;
    getStatusMessage(): React.JSX.Element | null;
    get prettyStatus(): string;
    get canLinkToKibanaApp(): boolean;
    get isDownloadReady(): boolean;
    get prettyJobTypeName(): undefined | string;
    get prettyTimeout(): string;
    /**
     * Returns a user friendly version of the report job creation date
     */
    getCreatedAtDate(): string;
    /**
     * Returns a user friendly version of the user that created the report job
     */
    getCreatedBy(): string;
    getCreatedAtLabel(): string | React.JSX.Element;
    getError(): string[] | undefined;
    getDeprecatedMessage(): undefined | string;
    getWarnings(): React.JSX.Element | undefined;
    getPrettyStatusTimestamp(): string;
    private formatDate;
    private getStatusTimestamp;
}
export {};
