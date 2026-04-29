/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import { isValidNonTransformationalESQLQuery } from '.';

describe('isValidNonTransformationalESQLQuery', () => {
  it('returns false for undefined query', () => {
    expect(isValidNonTransformationalESQLQuery(undefined)).toBe(false);
  });

  it('returns false for non-ES|QL query shape', () => {
    const query: Query = { query: 'host.name: foo', language: 'kuery' };
    expect(isValidNonTransformationalESQLQuery(query)).toBe(false);
  });

  it('returns false for empty ES|QL', () => {
    const query: AggregateQuery = { esql: '' };
    expect(isValidNonTransformationalESQLQuery(query)).toBe(false);
  });

  it('returns false for ES|QL with parse errors', () => {
    const query: AggregateQuery = { esql: 'FROM logs-* | WHERE' };
    expect(isValidNonTransformationalESQLQuery(query)).toBe(false);
  });

  it.each([
    'FROM logs-* | STATS count()',
    'FROM logs-* | KEEP host.name',
    'FROM logs-* | FORK (STATS count()) (KEEP host.name)',
  ])('returns false for transformational ES|QL: %s', (esql) => {
    const query: AggregateQuery = { esql };
    expect(isValidNonTransformationalESQLQuery(query)).toBe(false);
  });

  it.each([
    'FROM logs-* | WHERE host.name == "foo"',
    'FROM logs-* | SORT @timestamp DESC',
    'FROM logs-* | LIMIT 10',
  ])('returns true for valid non-transformational ES|QL: %s', (esql) => {
    const query: AggregateQuery = { esql };
    expect(isValidNonTransformationalESQLQuery(query)).toBe(true);
  });
});
