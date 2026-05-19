import type { Writable } from 'stream';
import type { TypeOf } from '@kbn/config-schema';
import type { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CancellationToken } from '@kbn/reporting-common';
import type { BaseParams, BasePayload, TaskInstanceFields, TaskRunResult } from '@kbn/reporting-common/types';
import type { ConfigSchema } from './config_schema';
import type { ExportType } from './export_type';
export interface ReportingServerPluginSetup {
    registerExportTypes: (item: ExportType) => void;
}
export type CreateJobFn<JobParamsType = BaseParams, JobPayloadType = BasePayload> = (jobParams: JobParamsType, context: CustomRequestHandlerContext<{
    reporting: ReportingServerPluginSetup | null;
}>, req: KibanaRequest) => Promise<Omit<JobPayloadType, 'headers' | 'spaceId'>>;
export interface RunTaskOpts<TaskPayloadType = BasePayload> {
    jobId: string;
    payload: TaskPayloadType;
    request: KibanaRequest;
    taskInstanceFields: TaskInstanceFields;
    cancellationToken: CancellationToken;
    stream: Writable;
    useInternalUser?: boolean;
}
export type RunTaskFn<TaskPayloadType = BasePayload> = (opts: RunTaskOpts<TaskPayloadType>) => Promise<TaskRunResult>;
export interface TimeRangeParams {
    min?: Date | string | number | null;
    max?: Date | string | number | null;
}
export type ReportingConfigType = TypeOf<typeof ConfigSchema>;
