/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Ensure, SerializableRecord } from '@kbn/utility-types';
import type { LayoutParams } from '@kbn/screenshotting-plugin/common';
import { TypeOf } from '@kbn/config-schema';
import { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import { Writable } from 'stream';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { LocatorParams } from './url';
import { ConfigSchema } from './schema';
import { CancellationToken } from './cancellation_token';
import { TaskRunResult } from './metrics';

/**
 * @deprecated
 */
export type BaseParams = Ensure<
  {
    layout?: LayoutParams;
    objectType: string;
    title: string;
    browserTimezone: string; // to format dates in the user's time zone
    version: string; // to handle any state migrations
  },
  SerializableRecord
>;

/**
 * Report job parameters that an application must return from its
 * getSharingData function.
 */
export type BaseParamsV2 = BaseParams & {
  locatorParams: LocatorParams[];
};

/**
 * @deprecated
 */
export interface BasePayload extends BaseParams {
  headers: string;
  spaceId?: string;
  isDeprecated?: boolean;
}

export type JobId = string;

/**
 * Report job parameters, after they are processed in the request handler.
 */
export interface BasePayloadV2 extends BaseParamsV2 {
  headers: string;
  spaceId?: string;
  isDeprecated?: boolean;
}

// ExportType dependency types
export type ReportingConfigType = TypeOf<typeof ConfigSchema>;

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

interface CommonReportingSetup {
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
  searchSource: SerializedSearchSourceFields;
  columns?: string[];
}
