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

import { uniq, defaults } from 'lodash';

import { findTestBundleUrl } from './find_test_bundle_url';
import { getShardingParamsFromUrl } from './get_sharding_params_from_url';
import { setupTopLevelDescribeFilter } from './setup_top_level_describe_filter';
import { getShardNum } from './get_shard_num';

const DEFAULT_PARAMS = {
  shards: 1,
  shard_num: 1,
};

export function setupTestSharding() {
  const pageUrl = window.location.href;
  const bundleUrl = findTestBundleUrl();

  // supports overriding params via the debug page
  // url in dev mode
  const params = defaults(
    {},
    getShardingParamsFromUrl(pageUrl),
    getShardingParamsFromUrl(bundleUrl),
    DEFAULT_PARAMS
  );

  const { shards: shardTotal, shard_num: shardNum } = params;
  if (shardNum < 1 || shardNum > shardTotal) {
    throw new TypeError(
      `shard_num param of ${shardNum} must be greater 0 and less than the total, ${shardTotal}`
    );
  }

  // track and log the number of ignored describe calls
  const ignoredDescribeShards = [];
  before(() => {
    const ignoredCount = ignoredDescribeShards.length;
    const ignoredFrom = uniq(ignoredDescribeShards).join(', ');
    console.log(`Ignored ${ignoredCount} top-level suites from ${ignoredFrom}`);
  });

  // Filter top-level describe statements as they come
  setupTopLevelDescribeFilter(describeName => {
    const describeShardNum = getShardNum(shardTotal, describeName);
    if (describeShardNum === shardNum) return true;
    // track shard numbers that we ignore
    ignoredDescribeShards.push(describeShardNum);
  });

  console.log(`ready to load tests for shard ${shardNum} of ${shardTotal}`);
}
