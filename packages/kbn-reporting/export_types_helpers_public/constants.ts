/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import type { BaseParams } from '@kbn/reporting-export-types-helpers-server';

export const CSV_SEARCHSOURCE_IMMEDIATE_TYPE = 'csv_searchsource_immediate';
// Licenses
export const LICENSE_TYPE_TRIAL = 'trial' as const;

export type IlmPolicyMigrationStatus = 'policy-not-found' | 'indices-not-managed-by-policy' | 'ok';

export interface IlmPolicyStatusResponse {
  status: IlmPolicyMigrationStatus;
}

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

/**
 * Report job parameters, after they are processed in the request handler.
 */
export interface BasePayloadV2 extends BaseParamsV2 {
  headers: string;
  spaceId?: string;
  isDeprecated?: boolean;
}

type JobId = string;
type DownloadLink = string;
export type DownloadReportFn = (jobId: JobId) => DownloadLink;

type ManagementLink = string;
export type ManagementLinkFn = () => ManagementLink;
