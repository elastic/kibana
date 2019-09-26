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

import murmurHash3 from 'murmurhash3js';

// murmur hashes are 32bit unsigned integers
const MAX_HASH = Math.pow(2, 32);

/**
*  Determine the shard number for a suite by hashing
*  its name and placing it based on the hash
*
*  @param {number} shardTotal - the total number of shards
*  @param {string} suiteName - the suite name to hash
*  @return {number} shardNum - 1-based shard number
*/
export function getShardNum(shardTotal, suiteName) {
  const hashIntsPerShard = MAX_HASH / shardTotal;

  const hashInt = murmurHash3.x86.hash32(suiteName);

  // murmur3 produces 32bit integers, so we devide it by the number of chunks
  // to determine which chunk the suite should fall in. +1 because the current
  // chunk is 1-based
  const shardNum = Math.floor(hashInt / hashIntsPerShard) + 1;

  // It's not clear if hash32 can produce the MAX_HASH or not,
  // but this just ensures that shard numbers don't go out of bounds
  // and cause tests to be ignored unnecessarily
  return Math.max(1, Math.min(shardNum, shardTotal));
}
