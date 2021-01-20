/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
