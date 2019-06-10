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

import { parse as parseUrl } from 'url';

/**
 *  This function extracts the relevant "shards" and "shard_num"
 *  params from the url.
 *
 *  @param {string} testBundleUrl
 *  @return {object} params
 *  @property {number} params.shards - the total number of shards
 *  @property {number} params.shard_num - the current shard number, 1 based
 */
export function getShardingParamsFromUrl(url) {
  const parsedUrl = parseUrl(url, true);
  const parsedQuery = parsedUrl.query || {};

  const params = {};
  if (parsedQuery.shards) {
    params.shards = parseInt(parsedQuery.shards, 10);
  }

  if (parsedQuery.shard_num) {
    params.shard_num = parseInt(parsedQuery.shard_num, 10);
  }

  return params;
}
