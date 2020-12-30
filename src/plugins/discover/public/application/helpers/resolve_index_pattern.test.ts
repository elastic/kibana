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

import {
  loadIndexPattern,
  getFallbackIndexPatternId,
  IndexPatternSavedObject,
} from './resolve_index_pattern';
import { indexPatternsMock } from '../../__mocks__/index_patterns';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { configMock } from '../../__mocks__/config';

describe('Resolve index pattern tests', () => {
  test('returns valid data for an existing index pattern', async () => {
    const indexPatternId = 'the-index-pattern-id';
    const result = await loadIndexPattern(indexPatternId, indexPatternsMock, configMock);
    expect(result.loaded).toEqual(indexPatternMock);
    expect(result.stateValFound).toEqual(true);
    expect(result.stateVal).toEqual(indexPatternId);
  });
  test('returns fallback data for an invalid index pattern', async () => {
    const indexPatternId = 'invalid-id';
    const result = await loadIndexPattern(indexPatternId, indexPatternsMock, configMock);
    expect(result.loaded).toEqual(indexPatternMock);
    expect(result.stateValFound).toBe(false);
    expect(result.stateVal).toBe(indexPatternId);
  });
  test('getFallbackIndexPatternId with an empty indexPatterns array', async () => {
    const result = await getFallbackIndexPatternId([], '');
    expect(result).toBe('');
  });
  test('getFallbackIndexPatternId with an indexPatterns array', async () => {
    const list = await indexPatternsMock.getCache();
    const result = await getFallbackIndexPatternId(
      (list as unknown) as IndexPatternSavedObject[],
      ''
    );
    expect(result).toBe('the-index-pattern-id');
  });
});
