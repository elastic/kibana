import type { LayoutParams, PerformanceMetrics as ScreenshotMetrics } from '@kbn/screenshotting-plugin/common';
import type { ConcreteTaskInstance, RruleSchedule } from '@kbn/task-manager-plugin/server';
import type { JOB_STATUS } from './constants';
import type { LocatorParams } from './url';
export type * from './url';
export interface CsvMetrics {
    rows: number;
}
export interface TaskRunMetrics {
    csv?: CsvMetrics;
    png?: ScreenshotMetrics;
    pdf?: ScreenshotMetrics & {
        pages?: number;
    };
}
export interface TaskRunResult {
    content_type: string | null;
    csv_contains_formulas?: boolean;
    max_size_reached?: boolean;
    warnings?: string[];
    metrics?: TaskRunMetrics;
    /**
     * When running a report task we may finish with warnings that were triggered
     * by an error. We can pass the error code via the task run result to the
     * task runner so that it can be recorded for telemetry.
     *
     * Alternatively, this field can be populated in the event that the task does
     * not complete in the task runner's error handler.
     */
    error_code?: string;
}
export interface ExecutionError {
    name: string;
    message: string;
    stack: string;
    cause: string;
}
export interface ReportOutput extends TaskRunResult {
    content: string | null;
    size: number;
}
/**
 * @see also {@link src/platform/packages/private/kbn-reporting/common/types.ts}
 */
export type CsvPagingStrategy = 'pit' | 'scroll';
export interface BaseParams {
    browserTimezone: string;
    objectType: string;
    title: string;
    version: string;
    forceNow?: string;
    layout?: LayoutParams;
    pagingStrategy?: CsvPagingStrategy;
}
/**
 * Report job parameters that an application must return from its
 * getSharingData function.
 */
export type BaseParamsV2 = BaseParams & {
    locatorParams: LocatorParams[];
};
export interface BasePayload extends BaseParams {
    headers: string;
    spaceId?: string;
    isDeprecated?: boolean;
}
/**
 * Timestamp metrics about the task lifecycle
 */
export type TaskInstanceFields = Pick<ConcreteTaskInstance, 'startedAt' | 'retryAt'>;
export type JobId = string;
/**
 * Report job parameters, after they are processed in the request handler.
 */
export interface BasePayloadV2 extends BaseParamsV2 {
    headers: string;
    spaceId?: string;
    isDeprecated?: boolean;
}
export interface ReportingServerInfo {
    basePath: string;
    protocol: string;
    hostname: string;
    port: number;
    name: string;
    uuid: string;
}
export interface ReportingHealthInfo {
    isSufficientlySecure: boolean;
    hasPermanentEncryptionKey: boolean;
    areNotificationsEnabled: boolean;
}
export type IlmPolicyMigrationStatus = 'policy-not-found' | 'indices-not-managed-by-policy' | 'ok';
export interface IlmPolicyStatusResponse {
    status: IlmPolicyMigrationStatus;
}
export interface ReportDocumentHead {
    _id: string;
    _index: string;
    _seq_no: number;
    _primary_term: number;
}
export interface ReportFields {
    queue_time_ms?: number[];
    execution_time_ms?: number[];
}
export interface ReportSource {
    jobtype: string;
    created_by: string | false;
    payload: BasePayload;
    meta: {
        objectType: string;
        layout?: string;
        isDeprecated?: boolean;
    };
    migration_version: string;
    attempts: number;
    created_at: string;
    '@timestamp'?: string;
    status: JOB_STATUS;
    scheduled_report_id?: string;
    output: ReportOutput | null;
    /**
     * Execution error during one of the execute task runs.
     */
    error?: ExecutionError | unknown;
    kibana_name?: string;
    kibana_id?: string;
    space_id?: string;
    timeout?: number;
    max_attempts?: number;
    started_at?: string;
    completed_at?: string;
    process_expiration?: string | null;
    metrics?: TaskRunMetrics;
}
export interface ReportDocument extends ReportDocumentHead {
    _source: ReportSource;
}
interface ReportSimple extends Omit<ReportSource, 'payload' | 'output'> {
    payload: Omit<ReportSource['payload'], 'headers'>;
    output?: Omit<ReportOutput, 'content'>;
    queue_time_ms?: number;
    execution_time_ms?: number;
}
export interface ReportApiJSON extends ReportSimple {
    id: string;
    index: string;
}
export interface LicenseCheckResults {
    enableLinks: boolean;
    showLinks: boolean;
    message: string;
}
export interface ScheduledReportApiJSON {
    id: string;
    created_at: string;
    created_by: string;
    enabled: boolean;
    jobtype: string;
    last_run: string | undefined;
    next_run: string | undefined;
    notification?: {
        email?: {
            to?: string[];
            cc?: string[];
            bcc?: string[];
            subject?: string;
            message?: string;
        };
    };
    payload?: ReportApiJSON['payload'];
    schedule: RruleSchedule;
    space_id: string;
    title: string;
}
