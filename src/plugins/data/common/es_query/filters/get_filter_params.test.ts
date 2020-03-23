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

import { phraseFilter, phrasesFilter, rangeFilter, existsFilter } from './stubs';
import { getFilterParams } from './get_filter_params';

describe('getFilterParams', () => {
  it('should retrieve params from phrase filter', () => {
    const params = getFilterParams(phraseFilter);
    expect(params).toBe('ios');
  });

  it('should retrieve params from phrases filter', () => {
    const params = getFilterParams(phrasesFilter);
    expect(params).toEqual(['win xp', 'osx']);
  });

  it('should retrieve params from range filter', () => {
    const params = getFilterParams(rangeFilter);
    expect(params).toEqual({ from: 0, to: 10 });
  });

  it('should return undefined for exists filter', () => {
    const params = getFilterParams(existsFilter);
    expect(params).toBeUndefined();
  });
});
