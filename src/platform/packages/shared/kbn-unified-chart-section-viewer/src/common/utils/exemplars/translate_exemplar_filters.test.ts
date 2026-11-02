/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FilterStateStore, type Filter } from '@kbn/es-query';
import { translateExemplarFilters } from './translate_exemplar_filters';

const METRIC = 'metrics.http.server.request.duration';

const phrase = (
  key: string,
  value: string | number,
  meta: Partial<Filter['meta']> = {}
): Filter => ({
  meta: { key, type: 'phrase', params: { query: value }, ...meta },
  query: { match_phrase: { [key]: value } },
});

describe('translateExemplarFilters', () => {
  it('passes dimension filters through unchanged', () => {
    const filter = phrase('attributes.http.route', '/orders');

    expect(translateExemplarFilters([filter], METRIC)).toEqual([filter]);
  });

  it('passes filters without a field key through unchanged', () => {
    const filter: Filter = { meta: {}, query: { query_string: { query: 'anything' } } };

    expect(translateExemplarFilters([filter], METRIC)).toEqual([filter]);
  });

  it('rewrites a phrase filter on the chart metric onto value', () => {
    expect(translateExemplarFilters([phrase(METRIC, 42)], METRIC)).toEqual([
      {
        meta: { key: 'value', type: 'phrase', params: { query: 42 } },
        query: { match_phrase: { value: 42 } },
      },
    ]);
  });

  it('rewrites a range filter on the chart metric onto value', () => {
    const filter: Filter = {
      meta: { key: METRIC, type: 'range', params: { gte: 1, lt: 5 } },
      query: { range: { [METRIC]: { gte: 1, lt: 5 } } },
    };

    expect(translateExemplarFilters([filter], METRIC)[0].query).toEqual({
      range: { value: { gte: 1, lt: 5 } },
    });
  });

  it('rewrites an exists filter on the chart metric onto value', () => {
    const filter: Filter = {
      meta: { key: METRIC, type: 'exists' },
      query: { exists: { field: METRIC } },
    };

    expect(translateExemplarFilters([filter], METRIC)[0].query).toEqual({
      exists: { field: 'value' },
    });
  });

  it('rewrites every clause of a phrases filter on the chart metric', () => {
    const filter: Filter = {
      meta: { key: METRIC, type: 'phrases', params: [1, 2] },
      query: {
        bool: {
          should: [{ match_phrase: { [METRIC]: 1 } }, { match_phrase: { [METRIC]: 2 } }],
          minimum_should_match: 1,
        },
      },
    };

    expect(translateExemplarFilters([filter], METRIC)[0].query).toEqual({
      bool: {
        should: [{ match_phrase: { value: 1 } }, { match_phrase: { value: 2 } }],
        minimum_should_match: 1,
      },
    });
  });

  it('preserves negation, disabled state and pinning while rewriting', () => {
    const filter: Filter = {
      ...phrase(METRIC, 42, { negate: true, disabled: true }),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };

    const [translated] = translateExemplarFilters([filter], METRIC);

    expect(translated.meta).toEqual(
      expect.objectContaining({ key: 'value', negate: true, disabled: true })
    );
    expect(translated.$state).toEqual(filter.$state);
  });

  it('drops filters on other metric fields', () => {
    expect(translateExemplarFilters([phrase('metrics.orders.created', 5)], METRIC)).toEqual([]);
  });

  it('keeps ordering across mixed filters', () => {
    const dimension = phrase('resource.attributes.service.name', 'checkout');

    expect(
      translateExemplarFilters(
        [phrase('metrics.orders.created', 5), dimension, phrase(METRIC, 42)],
        METRIC
      ).map((filter) => filter.meta.key)
    ).toEqual(['resource.attributes.service.name', 'value']);
  });
});
