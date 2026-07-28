/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stripNullDimensionWhere } from './strip_null_dimension_where';

describe('stripNullDimensionWhere', () => {
  it('returns undefined input unchanged', () => {
    expect(stripNullDimensionWhere(undefined, ['attributes.service.name'])).toBe(undefined);
  });

  it('returns the query unchanged without selected dimensions', () => {
    const query = 'TS metrics-* | WHERE attributes.service.name IS NULL';

    expect(stripNullDimensionWhere(query)).toBe(query);
  });

  it('removes a standalone null filter for a selected dimension', () => {
    const query =
      'TS metrics-* | WHERE host.name == "host-a" | WHERE attributes.service.name IS NULL';

    const result = stripNullDimensionWhere(query, ['attributes.service.name']);

    expect(result).toContain('WHERE host.name == "host-a"');
    expect(result).not.toContain('attributes.service.name IS NULL');
  });

  it('removes standalone null filters for multiple selected dimensions', () => {
    const query =
      'TS metrics-* | WHERE attributes.service.name IS NULL | WHERE host.name IS NULL | WHERE cloud.region == "us-east-1"';

    const result = stripNullDimensionWhere(query, ['attributes.service.name', 'host.name']);

    expect(result).toContain('WHERE cloud.region == "us-east-1"');
    expect(result).not.toContain('attributes.service.name IS NULL');
    expect(result).not.toContain('host.name IS NULL');
  });

  it('retains a null filter for an unselected dimension', () => {
    const query = 'TS metrics-* | WHERE attributes.service.name IS NULL';

    expect(stripNullDimensionWhere(query, ['host.name'])).toBe(query);
  });

  it('retains a standalone non-null filter', () => {
    const query = 'TS metrics-* | WHERE attributes.service.name IS NOT NULL';

    expect(stripNullDimensionWhere(query, ['attributes.service.name'])).toBe(query);
  });

  it('does not rewrite a compound expression', () => {
    const query = 'TS metrics-* | WHERE attributes.service.name IS NULL AND host.name == "host-a"';

    expect(stripNullDimensionWhere(query, ['attributes.service.name'])).toBe(query);
  });

  it('does not rewrite a null check around a transformed dimension', () => {
    const query = 'TS metrics-* | WHERE TO_STRING(attributes.service.name) IS NULL';

    expect(stripNullDimensionWhere(query, ['attributes.service.name'])).toBe(query);
  });

  it('preserves SET commands and unrelated filters', () => {
    const query =
      'SET unmapped_fields="NULLIFY"; TS metrics-* | WHERE host.name == "host-a" | WHERE attributes.service.name IS NULL';

    const result = stripNullDimensionWhere(query, ['attributes.service.name']);

    expect(result).toContain('SET unmapped_fields = "NULLIFY";');
    expect(result).toContain('WHERE host.name == "host-a"');
    expect(result).not.toContain('attributes.service.name IS NULL');
  });

  it('returns a malformed query unchanged', () => {
    const query = 'TS metrics-* | WHERE';

    expect(stripNullDimensionWhere(query, ['attributes.service.name'])).toBe(query);
  });
});
