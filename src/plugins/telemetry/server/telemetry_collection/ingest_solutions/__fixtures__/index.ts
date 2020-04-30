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

import { IngestSolutionsPayload } from '../ingest_solutions';

export const baseIngestSolutionsPayload: IngestSolutionsPayload = {
  data_providers: {
    apm: { index_count: 0 },
    metricbeat: { index_count: 0 },
    heartbeat: { index_count: 0 },
    prometheusbeat: { index_count: 0 },
    filebeat: { index_count: 0 },
    functionbeat: { index_count: 0 },
    fluentd: { index_count: 0 },
    telegraf: { index_count: 0 },
    fluentbit: { index_count: 0 },
    nginx: { index_count: 0 },
    apache: { index_count: 0 },
    logs: { index_count: 0 },
    auditbeat: { index_count: 0 },
    winlogbeat: { index_count: 0 },
    packetbeat: { index_count: 0 },
  },
};
