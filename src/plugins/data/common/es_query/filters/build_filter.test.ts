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

import { buildFilter, FilterStateStore, FILTERS } from '.';
import { stubIndexPattern, stubFields } from '../../../common/stubs';

describe('buildFilter', () => {
  it('should build phrase filters', () => {
    const params = 'foo';
    const alias = 'bar';
    const state = FilterStateStore.APP_STATE;
    const filter = buildFilter(
      stubIndexPattern,
      stubFields[0],
      FILTERS.PHRASE,
      false,
      false,
      params,
      alias,
      state
    );
    expect(filter.meta.negate).toBe(false);
    expect(filter.meta.alias).toBe(alias);

    expect(filter.$state).toBeDefined();
    if (filter.$state) {
      expect(filter.$state.store).toBe(state);
    }
  });

  it('should build phrases filters', () => {
    const params = ['foo', 'bar'];
    const alias = 'bar';
    const state = FilterStateStore.APP_STATE;
    const filter = buildFilter(
      stubIndexPattern,
      stubFields[0],
      FILTERS.PHRASES,
      false,
      false,
      params,
      alias,
      state
    );
    expect(filter.meta.type).toBe(FILTERS.PHRASES);
    expect(filter.meta.negate).toBe(false);
    expect(filter.meta.alias).toBe(alias);
    expect(filter.$state).toBeDefined();
    if (filter.$state) {
      expect(filter.$state.store).toBe(state);
    }
  });

  it('should build range filters', () => {
    const params = { from: 'foo', to: 'qux' };
    const alias = 'bar';
    const state = FilterStateStore.APP_STATE;
    const filter = buildFilter(
      stubIndexPattern,
      stubFields[0],
      FILTERS.RANGE,
      false,
      false,
      params,
      alias,
      state
    );
    expect(filter.meta.negate).toBe(false);
    expect(filter.meta.alias).toBe(alias);
    expect(filter.$state).toBeDefined();
    if (filter.$state) {
      expect(filter.$state.store).toBe(state);
    }
  });

  it('should build exists filters', () => {
    const params = undefined;
    const alias = 'bar';
    const state = FilterStateStore.APP_STATE;
    const filter = buildFilter(
      stubIndexPattern,
      stubFields[0],
      FILTERS.EXISTS,
      false,
      false,
      params,
      alias,
      state
    );
    expect(filter.meta.negate).toBe(false);
    expect(filter.meta.alias).toBe(alias);
    expect(filter.$state).toBeDefined();
    if (filter.$state) {
      expect(filter.$state.store).toBe(state);
    }
  });

  it('should include disabled state', () => {
    const params = undefined;
    const alias = 'bar';
    const state = FilterStateStore.APP_STATE;
    const filter = buildFilter(
      stubIndexPattern,
      stubFields[0],
      FILTERS.EXISTS,
      true,
      true,
      params,
      alias,
      state
    );
    expect(filter.meta.disabled).toBe(true);
    expect(filter.meta.negate).toBe(true);
  });
});
