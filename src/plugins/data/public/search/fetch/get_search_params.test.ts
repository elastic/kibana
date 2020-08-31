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

import { getSearchParams } from './get_search_params';
import { GetConfigFn, UI_SETTINGS } from '../../../common';

function getConfigStub(config: any = {}): GetConfigFn {
  return (key) => config[key];
}

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
    let config = getConfigStub({ [UI_SETTINGS.SEARCH_INCLUDE_FROZEN]: true });
    let searchParams = getSearchParams(config);
    expect(searchParams.ignore_throttled).toBe(false);

    config = getConfigStub({ [UI_SETTINGS.SEARCH_INCLUDE_FROZEN]: false });
    searchParams = getSearchParams(config);
    expect(searchParams.ignore_throttled).toBe(true);
  });

  test('includes max_concurrent_shard_requests according to courier:maxConcurrentShardRequests', () => {
    let config = getConfigStub({ [UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS]: 0 });
    let searchParams = getSearchParams(config);
    expect(searchParams.max_concurrent_shard_requests).toBe(undefined);

    config = getConfigStub({ [UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS]: 5 });
    searchParams = getSearchParams(config);
    expect(searchParams.max_concurrent_shard_requests).toBe(5);
  });

  test('includes timeout according to esShardTimeout if greater than 0', () => {
    const config = getConfigStub();
    let searchParams = getSearchParams(config, 0);
    expect(searchParams.timeout).toBe(undefined);

    searchParams = getSearchParams(config, 100);
    expect(searchParams.timeout).toBe('100ms');
  });
});
