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

import { http } from './_index_patterns_api_client.test.mock';
import { IndexPatternsApiClient } from '../index_patterns_api_client';

jest.mock('../../errors', () => ({
  SavedObjectNotFound: jest.fn(),
  DuplicateField: jest.fn(),
  IndexPatternMissingIndices: jest.fn(),
}));

jest.mock('../errors', () => ({
  IndexPatternMissingIndices: jest.fn(),
}));

describe('IndexPatternsApiClient', () => {
  it('uses the right URI to fetch fields for time patterns', async function () {
    const fetchSpy = jest.spyOn(http, 'fetch').mockImplementation(() => ({}));
    const indexPatternsApiClient = new IndexPatternsApiClient();
    await indexPatternsApiClient.getFieldsForTimePattern();

    expect(fetchSpy).toHaveBeenCalledWith('/api/index_patterns/_fields_for_time_pattern', {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      method: 'GET',
      prependBasePath: true,
      query: {},
    });
  });

  it('uses the right URI to fetch fields for wildcard', async function () {
    const fetchSpy = jest.spyOn(http, 'fetch').mockImplementation(() => ({}));
    const indexPatternsApiClient = new IndexPatternsApiClient();
    await indexPatternsApiClient.getFieldsForWildcard();

    expect(fetchSpy).toHaveBeenCalledWith('/api/index_patterns/_fields_for_wildcard', {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      method: 'GET',
      prependBasePath: true,
      query: {},
    });
  });

  it('uses the right URI to fetch fields for wildcard given a type', async function () {
    const fetchSpy = jest.spyOn(http, 'fetch').mockImplementation(() => ({}));
    const indexPatternsApiClient = new IndexPatternsApiClient();
    await indexPatternsApiClient.getFieldsForWildcard({ type: 'rollup' });

    expect(fetchSpy).toHaveBeenCalledWith('/api/index_patterns/rollup/_fields_for_wildcard', {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      method: 'GET',
      prependBasePath: true,
      query: {},
    });
  });
});
