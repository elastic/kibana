/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Writable } from 'stream';
import type {
  BaseParams,
  BaseParamsV2,
  BasePayload,
  BasePayloadV2,
  TaskRunResult,
} from '@kbn/reporting-common/types';
import type { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { LocatorParams, CancellationToken } from '@kbn/reporting-common';

/**
 * @internal
 */
export interface ReportingServerInfo {
  port: number;
  name: string;
  uuid: string;
  basePath: string;
  protocol: string;
  hostname: string;
}

export interface CommonReportingSetup {
  registerExportTypes: () => void;
  /**
   * Used to inform plugins if Reporting config is compatible with UI Capabilities / Application Sub-Feature Controls
   */
  usesUiCapabilities: () => boolean;
}

export type ReportingRequestHandlerContext = CustomRequestHandlerContext<{
  reporting: CommonReportingSetup | null;
}>;

/**
 * Internal Types
 */
// standard type for create job function of any ExportType implementation
export type CreateJobFn<JobParamsType = BaseParams, JobPayloadType = BasePayload> = (
  jobParams: JobParamsType,
  context: ReportingRequestHandlerContext,
  req: KibanaRequest
) => Promise<Omit<JobPayloadType, 'headers' | 'spaceId'>>;

// standard type for run task function of any ExportType implementation
export type RunTaskFn<TaskPayloadType = BasePayload> = (
  jobId: string,
  payload: TaskPayloadType,
  cancellationToken: CancellationToken,
  stream: Writable
) => Promise<TaskRunResult>;

export interface JobParamsDownloadCSV {
  browserTimezone: string;
  title: string;
  searchSource: unknown;
  columns?: string[];
}

interface Layout {
  id?: 'preserve_layout' | 'print' | 'canvas';
}

/**
 * Structure of stored job data provided by create_job
 */
export interface TaskPayloadPDF extends BasePayload {
  layout: Layout;
  forceNow?: string;
  objects: Array<{ relativeUrl: string }>;
}

interface BaseParamsPNG {
  layout: Layout;
  forceNow?: string;
  relativeUrl: string;
}

// Job params: structure of incoming user request data
/**
 * @deprecated
 */
export type JobParamsPNGDeprecated = BaseParamsPNG & BaseParams;

// Job payload: structure of stored job data provided by create_job
export type TaskPayloadPNG = BaseParamsPNG & BasePayload;

interface BaseParamsPDFV2 {
  layout: Layout;

  /**
   * This value is used to re-create the same visual state as when the report was requested as well as navigate to the correct page.
   */
  locatorParams: LocatorParams[];
}

// Job params: structure of incoming user request data, after being parsed from RISON
export type JobParamsPDFV2 = BaseParamsPDFV2 & BaseParams;

export type JobAppParamsPDFV2 = Omit<JobParamsPDFV2, 'browserTimezone' | 'version'>;

// Job payload: structure of stored job data provided by create_job
export interface TaskPayloadPDFV2 extends BasePayload, BaseParamsPDFV2 {
  layout: Layout;
  /**
   * The value of forceNow is injected server-side every time a given report is generated.
   */
  forceNow: string;
}
interface BaseParamsCSV {
  searchSource: unknown;
  columns?: string[];
}

export type JobParamsCSV = BaseParamsCSV & BaseParams;
export type TaskPayloadCSV = BaseParamsCSV & BasePayload;

interface CsvFromSavedObjectBase {
  objectType: 'search';
}

/**
 * Makes title optional, as it can be derived from the saved search object
 */
export type JobParamsCsvFromSavedObject = CsvFromSavedObjectBase &
  Omit<BaseParamsV2, 'title'> & { title?: string };

/**
 *
 */
export type TaskPayloadCsvFromSavedObject = CsvFromSavedObjectBase & BasePayloadV2;

export interface JobParamsPNGV2 extends BaseParams {
  layout: Layout;
  /**
   * This value is used to re-create the same visual state as when the report was requested as well as navigate to the correct page.
   */
  locatorParams: LocatorParams;
}

// Job payload: structure of stored job data provided by create_job
export interface TaskPayloadPNGV2 extends BasePayload {
  layout: Layout;
  forceNow: string;
  /**
   * Even though we only ever handle one locator for a PNG, we store it as an array for consistency with how PDFs are stored
   */
  locatorParams: LocatorParams[];
}
