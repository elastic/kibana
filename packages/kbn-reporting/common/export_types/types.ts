/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomRequestHandlerContext } from '@kbn/core/server';
import { SerializableRecord } from '@kbn/utility-types';

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
