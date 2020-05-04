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

export const INGEST_SOLUTIONS_ID = 'ingest_solutions';

// TODO: Ideally this list should be updated from an external public URL (similar to the newsfeed)
// But it's good to have a minimum list shipped with the build.
export const TECHNOLOGIES = [
  { name: 'apm', pattern: 'apm-*' },
  { name: 'metricbeat', pattern: 'metricbeat-*' },
  { name: 'heartbeat', pattern: 'heartbeat-*' },
  { name: 'prometheusbeat', pattern: 'prometheusbeat*' },
  { name: 'filebeat', pattern: 'filebeat-*' },
  { name: 'functionbeat', pattern: 'functionbeat-*' },
  { name: 'fluentd', pattern: 'fluentd*' },
  { name: 'telegraf', pattern: 'telegraf*' },
  { name: 'fluentbit', pattern: 'fluentbit*' },
  { name: 'nginx', pattern: 'nginx*' },
  { name: 'apache', pattern: 'apache*' },
  { name: 'logs', pattern: '*logs*' },
  { name: 'auditbeat', pattern: 'auditbeat-*' },
  { name: 'winlogbeat', pattern: 'winlogbeat-*' },
  { name: 'packetbeat', pattern: 'packetbeat-*' },
] as const;
