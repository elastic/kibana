/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import { SerializableRecord } from '@kbn/utility-types';
import { Writable } from 'stream';
import { CancellationToken } from '../cancellation_token';
import { BaseParams, BasePayload } from './base';
import { TaskRunResult } from './metrics';

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

// @TODO ReportingStart is imported from reporting-plugin/server
export type ReportingRequestHandlerContext = CustomRequestHandlerContext<{
  reporting: any | null;
}>;

export interface LocatorParams<P extends SerializableRecord = SerializableRecord> {
  id: string;

  /**
   * Kibana version used to create the params
   */
  version: string;

  /**
   * Data to recreate the user's state in the application
   */
  params: P;
}

type Url = string;
type UrlLocatorTuple = [url: Url, locatorParams: LocatorParams];

export type UrlOrUrlLocatorTuple = Url | UrlLocatorTuple;

export interface ReportingServerInfo {
  port: number;
  name: string;
  uuid: string;
  basePath: string;
  protocol: string;
  hostname: string;
}
