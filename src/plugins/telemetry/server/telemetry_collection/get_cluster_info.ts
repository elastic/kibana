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

import { LegacyAPICaller } from 'kibana/server';

// This can be removed when the ES client improves the types
export interface ESClusterInfo {
  cluster_uuid: string;
  cluster_name: string;
  version: {
    number: string;
    build_flavor: string;
    build_type: string;
    build_hash: string;
    build_date: string;
    build_snapshot?: boolean;
    lucene_version: string;
    minimum_wire_compatibility_version: string;
    minimum_index_compatibility_version: string;
  };
}

/**
 * Get the cluster info from the connected cluster.
 *
 * This is the equivalent to GET /
 *
 * @param {function} callCluster The callWithInternalUser handler (exposed for testing)
 */
export function getClusterInfo(callCluster: LegacyAPICaller) {
  return callCluster<ESClusterInfo>('info');
}
