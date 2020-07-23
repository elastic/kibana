/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import type { OpsMetrics } from '../server/metrics';

export interface ServerStatus {
  id: string;
  title: string;
  state: string;
  message: string;
  uiColor: string;
  icon?: string;
  since?: string;
}

export type ServerMetrics = OpsMetrics & {
  collection_interval_in_millis: number;
};

export interface ServerVersion {
  number: string;
  build_hash: string;
  build_number: string;
  build_snapshot: string;
}

export interface StatusResponse {
  name: string;
  uuid: string;
  version: ServerVersion;
  status: {
    overall: ServerStatus;
    statuses: ServerStatus[];
  };
  metrics: ServerMetrics;
}
