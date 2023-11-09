/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Writable } from 'stream';

import type { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CancellationToken } from '@kbn/reporting-common';
import type { BaseParams, BasePayload, TaskRunResult } from '@kbn/reporting-common/types';

/**
 * @internal
 */
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
