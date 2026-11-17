/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Writable } from 'stream';
import type { TypeOf } from '@kbn/config-schema';
import type { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { PluginInitializerContext } from '@kbn/core-plugins-server';
import type { Logger } from '@kbn/logging';
import type { CancellationToken } from '@kbn/reporting-common';
import type {
  BaseParams,
  BasePayload,
  TaskInstanceFields,
  TaskRunResult,
} from '@kbn/reporting-common/types';

import type { ConfigSchema } from './config_schema';
import type { ExportType } from './export_type';

export interface ExportTypeFactoryDeps {
  core: CoreSetup;
  config: ReportingConfigType;
  logger: Logger;
  context: PluginInitializerContext<ReportingConfigType>;
}

export type ExportTypeFactory = (deps: ExportTypeFactoryDeps) => ExportType;

export interface ReportingServerPluginSetup {
  /**
   * Register an export type owned by another plugin. Call it during `setup`; Reporting builds the
   * export type with its own config, so it takes part in scheduling, permissions and email delivery.
   */
  registerExportTypes: (createExportType: ExportTypeFactory) => void;
}

// standard type for create job function of any ExportType implementation
export type CreateJobFn<JobParamsType = BaseParams, JobPayloadType = BasePayload> = (
  jobParams: JobParamsType,
  context: CustomRequestHandlerContext<{
    reporting: ReportingServerPluginSetup | null;
  }>,
  req: KibanaRequest
) => Promise<Omit<JobPayloadType, 'headers' | 'spaceId'>>;

export interface RunTaskOpts<TaskPayloadType = BasePayload> {
  jobId: string;
  payload: TaskPayloadType;
  request: KibanaRequest;
  taskInstanceFields: TaskInstanceFields;
  cancellationToken: CancellationToken;
  stream: Writable;
  useInternalUser?: boolean;
}

// standard type for run task function of any ExportType implementation
export type RunTaskFn<TaskPayloadType = BasePayload> = (
  opts: RunTaskOpts<TaskPayloadType>
) => Promise<TaskRunResult>;

export interface TimeRangeParams {
  min?: Date | string | number | null;
  max?: Date | string | number | null;
}

export type ReportingConfigType = TypeOf<typeof ConfigSchema>;
