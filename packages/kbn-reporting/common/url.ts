/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { JobId } from './types';

type DownloadLink = string;
export type DownloadReportFn = (jobId: JobId) => DownloadLink;

type ManagementLink = string;
export type ManagementLinkFn = () => ManagementLink;

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

export type IlmPolicyMigrationStatus = 'policy-not-found' | 'indices-not-managed-by-policy' | 'ok';

export interface IlmPolicyStatusResponse {
  status: IlmPolicyMigrationStatus;
}

type Url = string;
type UrlLocatorTuple = [url: Url, locatorParams: LocatorParams];

export type UrlOrUrlLocatorTuple = Url | UrlLocatorTuple;
