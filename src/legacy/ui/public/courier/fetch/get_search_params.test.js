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

import { getMSearchParams, getSearchParams } from './get_search_params';

function getConfigStub(config = {}) {
  return {
    get: key => config[key],
  };
}

describe('getMSearchParams', () => {
  test('includes rest_total_hits_as_int', () => {
    const config = getConfigStub();
    const msearchParams = getMSearchParams(config);
    expect(msearchParams.rest_total_hits_as_int).toBe(true);
  });

  test('includes ignore_throttled according to search:includeFrozen', () => {
    let config = getConfigStub({ 'search:includeFrozen': true });
    let msearchParams = getMSearchParams(config);
    expect(msearchParams.ignore_throttled).toBe(false);

    config = getConfigStub({ 'search:includeFrozen': false });
    msearchParams = getMSearchParams(config);
    expect(msearchParams.ignore_throttled).toBe(true);
  });

  test('includes max_concurrent_shard_requests according to courier:maxConcurrentShardRequests if greater than 0', () => {
    let config = getConfigStub({ 'courier:maxConcurrentShardRequests': 0 });
    let msearchParams = getMSearchParams(config);
    expect(msearchParams.max_concurrent_shard_requests).toBe(undefined);

    config = getConfigStub({ 'courier:maxConcurrentShardRequests': 5 });
    msearchParams = getMSearchParams(config);
    expect(msearchParams.max_concurrent_shard_requests).toBe(5);
  });

  test('does not include other search params that are included in the msearch header or body', () => {
    const config = getConfigStub({
      'search:includeFrozen': false,
      'courier:maxConcurrentShardRequests': 5,
    });
    const msearchParams = getMSearchParams(config);
    expect(msearchParams.hasOwnProperty('ignore_unavailable')).toBe(false);
    expect(msearchParams.hasOwnProperty('preference')).toBe(false);
    expect(msearchParams.hasOwnProperty('timeout')).toBe(false);
  });
});

describe('getSearchParams', () => {
  test('includes rest_total_hits_as_int', () => {
    const config = getConfigStub();
    const searchParams = getSearchParams(config);
    expect(searchParams.rest_total_hits_as_int).toBe(true);
  });

  test('includes ignore_unavailable', () => {
    const config = getConfigStub();
    const searchParams = getSearchParams(config);
    expect(searchParams.ignore_unavailable).toBe(true);
  });

  test('includes ignore_throttled according to search:includeFrozen', () => {
    let config = getConfigStub({ 'search:includeFrozen': true });
    let searchParams = getSearchParams(config);
    expect(searchParams.ignore_throttled).toBe(false);

    config = getConfigStub({ 'search:includeFrozen': false });
    searchParams = getSearchParams(config);
    expect(searchParams.ignore_throttled).toBe(true);
  });

  test('includes max_concurrent_shard_requests according to courier:maxConcurrentShardRequests', () => {
    let config = getConfigStub({ 'courier:maxConcurrentShardRequests': 0 });
    let searchParams = getSearchParams(config);
    expect(searchParams.max_concurrent_shard_requests).toBe(undefined);

    config = getConfigStub({ 'courier:maxConcurrentShardRequests': 5 });
    searchParams = getSearchParams(config);
    expect(searchParams.max_concurrent_shard_requests).toBe(5);
  });

  test('includes timeout according to esShardTimeout if greater than 0', () => {
    const config = getConfigStub();
    let searchParams = getSearchParams(config, null, 0);
    expect(searchParams.timeout).toBe(undefined);

    searchParams = getSearchParams(config, null, 100);
    expect(searchParams.timeout).toBe('100ms');
  });
});
