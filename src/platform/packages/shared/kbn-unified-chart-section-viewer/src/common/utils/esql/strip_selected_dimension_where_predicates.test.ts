/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stripSelectedDimensionWherePredicates } from './strip_selected_dimension_where_predicates';

describe('stripSelectedDimensionWherePredicates', () => {
  it('returns undefined input unchanged', () => {
    expect(stripSelectedDimensionWherePredicates(undefined, ['attributes.service.name'])).toBe(
      undefined
    );
  });

  it('returns the query unchanged without selected dimensions', () => {
    const query = 'TS metrics-* | WHERE attributes.service.name IS NULL';

    expect(stripSelectedDimensionWherePredicates(query)).toBe(query);
  });

  it('removes a standalone null filter for a selected dimension', () => {
    const query =
      'TS metrics-* | WHERE host.name == "host-a" | WHERE attributes.service.name IS NULL';

    const result = stripSelectedDimensionWherePredicates(query, ['attributes.service.name']);

    expect(result).toContain('WHERE host.name == "host-a"');
    expect(result).not.toContain('attributes.service.name IS NULL');
  });

  it('removes standalone null filters for multiple selected dimensions', () => {
    const query =
      'TS metrics-* | WHERE attributes.service.name IS NULL | WHERE host.name IS NULL | WHERE cloud.region == "us-east-1"';

    const result = stripSelectedDimensionWherePredicates(query, [
      'attributes.service.name',
      'host.name',
    ]);

    expect(result).toContain('WHERE cloud.region == "us-east-1"');
    expect(result).not.toContain('attributes.service.name IS NULL');
    expect(result).not.toContain('host.name IS NULL');
  });

  it('retains a null filter for an unselected dimension', () => {
    const query = 'TS metrics-* | WHERE attributes.service.name IS NULL';

    expect(stripSelectedDimensionWherePredicates(query, ['host.name'])).toBe(query);
  });

  it('removes a standalone non-null filter for a selected dimension', () => {
    const query = 'TS metrics-* | WHERE attributes.service.name IS NOT NULL';

    const result = stripSelectedDimensionWherePredicates(query, ['attributes.service.name']);

    expect(result).not.toContain('attributes.service.name');
    expect(result).toContain('TS metrics-*');
  });

  it('removes the selected-dimension branch of a compound AND', () => {
    const query = 'TS metrics-* | WHERE attributes.service.name IS NULL AND host.name IS NOT NULL';

    const result = stripSelectedDimensionWherePredicates(query, ['attributes.service.name']);

    expect(result).toContain('WHERE host.name IS NOT NULL');
    expect(result).not.toContain('attributes.service.name');
  });

  it('removes the selected-dimension branch of a compound OR', () => {
    const query = 'TS metrics-* | WHERE attributes.service.name IS NULL OR host.name == "host-a"';

    const result = stripSelectedDimensionWherePredicates(query, ['attributes.service.name']);

    expect(result).toContain('WHERE host.name == "host-a"');
    expect(result).not.toContain('attributes.service.name');
  });

  it('removes nested AND/OR predicates that reference a selected dimension', () => {
    const query =
      'TS metrics-* | WHERE (attributes.service.name IS NULL OR cloud.region == "us") AND host.name IS NOT NULL';

    const result = stripSelectedDimensionWherePredicates(query, ['attributes.service.name']);

    expect(result).toContain('cloud.region == "us"');
    expect(result).toContain('host.name IS NOT NULL');
    expect(result).not.toContain('attributes.service.name');
  });

  it('removes equality predicates on a selected dimension', () => {
    const query =
      'TS metrics-* | WHERE attributes.service.name == "payments" AND host.name IS NOT NULL';

    const result = stripSelectedDimensionWherePredicates(query, ['attributes.service.name']);

    expect(result).toContain('WHERE host.name IS NOT NULL');
    expect(result).not.toContain('attributes.service.name');
  });

  it('removes null checks around TO_STRING of a selected dimension', () => {
    const query = 'TS metrics-* | WHERE TO_STRING(attributes.service.name) IS NULL';

    const result = stripSelectedDimensionWherePredicates(query, ['attributes.service.name']);

    expect(result).not.toContain('attributes.service.name');
    expect(result).toContain('TS metrics-*');
  });

  it('preserves unrelated WHERE commands', () => {
    const query = 'TS metrics-* | WHERE host.name == "host-a"';

    expect(stripSelectedDimensionWherePredicates(query, ['attributes.service.name'])).toBe(query);
  });

  it('preserves SET commands and unrelated filters', () => {
    const query =
      'SET unmapped_fields="NULLIFY"; TS metrics-* | WHERE host.name == "host-a" | WHERE attributes.service.name IS NULL';

    const result = stripSelectedDimensionWherePredicates(query, ['attributes.service.name']);

    expect(result).toContain('SET unmapped_fields = "NULLIFY";');
    expect(result).toContain('WHERE host.name == "host-a"');
    expect(result).not.toContain('attributes.service.name IS NULL');
  });

  it('returns a malformed query unchanged', () => {
    const query = 'TS metrics-* | WHERE';

    expect(stripSelectedDimensionWherePredicates(query, ['attributes.service.name'])).toBe(query);
  });

  it('leaves EVAL aliases unchanged (documented non-goal)', () => {
    const query = 'TS metrics-* | EVAL d = attributes.service.name | WHERE d IS NULL';

    expect(stripSelectedDimensionWherePredicates(query, ['attributes.service.name'])).toBe(query);
  });

  it('leaves opaque KQL predicates unchanged (documented non-goal)', () => {
    const query = 'TS metrics-* | WHERE KQL("attributes.service.name : *")';

    expect(stripSelectedDimensionWherePredicates(query, ['attributes.service.name'])).toBe(query);
  });
});
