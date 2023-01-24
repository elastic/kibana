/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { ScalabilitySetup } from '@kbn/journeys';

export interface Request {
  transactionId: string;
  spanId?: string;
  name: string;
  date: string;
  duration: number;
  http: {
    method: string;
    path: string;
    query?: string;
    headers?: { [key: string]: string };
    params?: string;
    body?: JSON | string;
  };
  spanCount?: number;
}

export interface Stream<T extends Request> {
  startTime: number;
  endTime: number;
  requests: T[];
}

export interface TestData {
  kbnArchives?: string[];
  esArchives?: string[];
}

export interface CLIParams {
  param: {
    journeyName: string;
    scalabilitySetup?: ScalabilitySetup;
    testData: TestData;
    buildId: string;
    withoutStaticResources: boolean;
  };
  client: {
    baseURL: string;
    username: string;
    password: string;
  };
  log: ToolingLog;
}
