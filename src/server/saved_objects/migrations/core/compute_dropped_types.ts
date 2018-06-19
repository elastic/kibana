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

import _ from 'lodash';
import { computeSupportedTypes } from './compute_supported_types';
import { fetchOrDefault } from './fetch_or_default';
import { CallCluster, MigrationPlugin } from './types';

export interface DroppedTypesOpts {
  callCluster: CallCluster;
  index: string;
  kibanaVersion: string;
  plugins: MigrationPlugin[];
}

interface DocCount {
  key: string;
  doc_count: number;
}

/**
 * computeDroppedTypes determines what types (if any) exist in the index, but
 * not in any active plugins. These types would be dropped / lost if migrations
 * were run against the index.
 *
 * @param {DroppedTypesOpts} opts
 * @prop {CallCluster} callCluster - The elasticsearch.js function
 * @prop {string} index - The index being checked for unsupported types
 * @prop {string} kibanaVersion - The current Kibana version
 * @prop {MigrationPlugin[]} plugins - The active plugins whose types and
 *    migrations will be compared with those in the index.
 * @returns {Promise<{ [type: string]: number }>} - An object of type: count,
 *    indicating which types would be dropped if migrations were run, as well
 *    as a count of how many docs (per type) would be dropped.
 */
export async function computeDroppedTypes({
  index,
  callCluster,
  kibanaVersion,
  plugins,
}: DroppedTypesOpts): Promise<{ [type: string]: number }> {
  const supporedTypes = computeSupportedTypes({ kibanaVersion, plugins });
  const typeCounts = await fetchTypeCounts(index, callCluster);
  const droppedTypes = _.difference(_.keys(typeCounts), supporedTypes);
  return _.pick(typeCounts, droppedTypes);
}

async function fetchTypeCounts(
  index: string,
  callCluster: CallCluster
): Promise<{ [type: string]: number }> {
  const typeCountResult = await fetchOrDefault(
    callCluster('search', {
      body: { size: 0, aggs: { types: { terms: { field: 'type' } } } },
      index,
    }),
    null
  );
  const typeCounts = _.get<DocCount[]>(
    typeCountResult,
    'aggregations.types.buckets',
    []
  );
  return typeCounts.reduce(
    (acc, { key, doc_count }) => _.set(acc, key, doc_count),
    {}
  );
}
