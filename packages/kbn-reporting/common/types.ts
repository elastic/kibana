/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LayoutParams } from '@kbn/screenshotting-plugin/common';
import type { PerformanceMetrics as ScreenshotMetrics } from '@kbn/screenshotting-plugin/common/types';
import type { ByteSizeValue } from '@kbn/config-schema';
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

export interface ReportOutput extends TaskRunResult {
  content: string | null;
  size: number;
}

/**
 * @deprecated
 */
export interface BaseParams {
  layout?: LayoutParams;
  objectType: string;
  title: string;
  browserTimezone: string; // to format dates in the user's time zone
  version: string; // to handle any state migrations
}

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

export interface ReportingConfigType {
  encryptionKey?: string;
  kibanaServer: {
    protocol?: string;
    hostname?: string;
    port?: number;
  };
  csv: {
    checkForFormulas: boolean;
    escapeFormulaValues: boolean;
    useByteOrderMarkEncoding: boolean;
    maxSizeBytes: number | ByteSizeValue;
    scroll: {
      duration: string;
      size: number;
    };
  };
}

export interface ReportingServerInfo {
  basePath: string;
  protocol: string;
  hostname: string;
  port: number;
  name: string;
  uuid: string;
}
