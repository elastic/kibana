/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  LayoutParams,
  PerformanceMetrics as ScreenshotMetrics,
} from '@kbn/screenshotting-plugin/common';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { JOB_STATUS } from './constants';
import type { LocatorParams } from './url';

export * from './url';

export interface CsvMetrics {
  rows: number;
}

export interface TaskRunMetrics {
  csv?: CsvMetrics;
  png?: ScreenshotMetrics;
  pdf?: ScreenshotMetrics & { pages?: number };
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
 * @see also {@link packages/kbn-reporting/common/types.ts}
 */
export type CsvPagingStrategy = 'pit' | 'scroll';

export interface BaseParams {
  browserTimezone: string; // to format dates in the user's time zone
  objectType: string;
  title: string;
  version: string; // to handle any state migrations
  layout?: LayoutParams; // png & pdf only
  pagingStrategy?: CsvPagingStrategy; // csv only
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
  queue_time_ms?: number[]; // runtime field: started_at - created_at
  execution_time_ms?: number[]; // runtime field: completed_at - started_at
}

export interface ReportSource {
  /*
   * Required fields: populated in RequestHandler.enqueueJob when the request comes in to
   * generate the report
   */
  jobtype: string; // refers to `ExportTypeDefinition.jobType`
  created_by: string | false; // username or `false` if security is disabled. Used for ensuring users can only access the reports they've created.
  payload: BasePayload;
  meta: {
    // for telemetry
    objectType: string;
    layout?: string;
    isDeprecated?: boolean;
  };
  migration_version: string; // for reminding the user to update their POST URL
  attempts: number; // initially populated as 0
  created_at: string; // timestamp in UTC
  '@timestamp'?: string; // creation timestamp, only used for data streams compatibility
  status: JOB_STATUS;

  /*
   * `output` is only populated if the report job is completed or failed.
   */
  output: ReportOutput | null;
  /**
   * Execution error during one of the execute task runs.
   */
  error?: ExecutionError | unknown;

  /*
   * Optional fields: populated when the job is claimed to execute, and after
   * execution has finished
   */
  kibana_name?: string; // for troubleshooting
  kibana_id?: string; // for troubleshooting
  timeout?: number; // for troubleshooting: the actual comparison uses the config setting xpack.reporting.queue.timeout
  max_attempts?: number; // for troubleshooting: the actual comparison uses the config setting xpack.reporting.capture.maxAttempts
  started_at?: string; // timestamp in UTC
  completed_at?: string; // timestamp in UTC
  process_expiration?: string | null; // timestamp in UTC - is overwritten with `null` when the job needs a retry
  metrics?: TaskRunMetrics;
}

/*
 * The document created by Reporting to store in the .reporting index
 */
export interface ReportDocument extends ReportDocumentHead {
  _source: ReportSource;
}

/*
 * Info API response: to avoid unnecessary large payloads on a network, the
 * report query results do not include `payload.headers` or `output.content`,
 * which can be long strings of meaningless text
 */
interface ReportSimple extends Omit<ReportSource, 'payload' | 'output'> {
  payload: Omit<ReportSource['payload'], 'headers'>;
  output?: Omit<ReportOutput, 'content'>; // is undefined for report jobs that are not completed
  queue_time_ms?: number;
  execution_time_ms?: number;
}

/*
 * The response format for all of the report job APIs
 */
export interface ReportApiJSON extends ReportSimple {
  id: string;
  index: string;
}

export interface LicenseCheckResults {
  enableLinks: boolean;
  showLinks: boolean;
  message: string;
}
