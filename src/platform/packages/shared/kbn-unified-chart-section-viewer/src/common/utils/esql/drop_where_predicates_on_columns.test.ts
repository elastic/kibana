/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  dropWherePredicatesOnColumns,
  whereMentionsColumns,
} from './drop_where_predicates_on_columns';

describe('whereMentionsColumns', () => {
  it('is false when there is no WHERE or no column list', () => {
    expect(whereMentionsColumns('TS metrics-*', ['attributes.service.name'])).toBe(false);
    expect(whereMentionsColumns('TS metrics-* | WHERE host.name IS NOT NULL', undefined)).toBe(
      false
    );
  });

  it('is true when a WHERE mentions a listed column', () => {
    expect(
      whereMentionsColumns('TS metrics-* | WHERE attributes.service.name IS NULL', [
        'attributes.service.name',
      ])
    ).toBe(true);
  });

  it('is false when WHERE only mentions other columns', () => {
    expect(
      whereMentionsColumns('TS metrics-* | WHERE host.name IS NOT NULL', [
        'attributes.service.name',
      ])
    ).toBe(false);
  });
});

describe('dropWherePredicatesOnColumns', () => {
  it('returns the query unchanged when nothing should be dropped', () => {
    const query = 'TS metrics-* | WHERE host.name IS NOT NULL';
    expect(dropWherePredicatesOnColumns(query, ['attributes.service.name'])).toBe(query);
    expect(dropWherePredicatesOnColumns(query, [])).toBe(query);
    expect(dropWherePredicatesOnColumns(undefined, ['host.name'])).toBeUndefined();
  });

  it('drops an IS NULL predicate on the listed column', () => {
    expect(
      dropWherePredicatesOnColumns('TS metrics-* | WHERE attributes.service.name IS NULL', [
        'attributes.service.name',
      ])
    ).toBe('TS metrics-*');
  });

  it('keeps the other side of a compound AND', () => {
    expect(
      dropWherePredicatesOnColumns(
        'TS metrics-* | WHERE attributes.service.name IS NULL AND host.name IS NOT NULL',
        ['attributes.service.name']
      )
    ).toBe('TS metrics-* | WHERE host.name IS NOT NULL');
  });

  it('returns the original query when parsing fails', () => {
    const broken = 'TS metrics-* | WHERE';
    expect(dropWherePredicatesOnColumns(broken, ['host.name'])).toBe(broken);
  });
});
