/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
export type ClusterReadyStatus = 'green' | 'yellow';
export interface WaitOptions {
  client: Client;
  expectedStatus: ClusterReadyStatus;
  log: ToolingLog;
  readyTimeout?: number;
}
/**
 * General method to wait for the ES cluster status to be yellow or green
 */
export declare function waitUntilClusterReady({
  client,
  expectedStatus,
  log,
  readyTimeout,
}: WaitOptions): Promise<void>;
