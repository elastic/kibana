/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEsqlInspectorStats } from './get_esql_inspector_stats';

describe('getEsqlInspectorStats', () => {
  it('reports the number of rows as hits', () => {
    const stats = getEsqlInspectorStats({ values: [[1], [2], [3]] });

    expect(stats.hits.value).toBe('3');
  });

  it('omits query time and documents processed when the response does not have them', () => {
    const stats = getEsqlInspectorStats({ values: [] });

    expect(Object.keys(stats)).toEqual(['hits']);
  });

  it('reports a query time of 0 ms', () => {
    const stats = getEsqlInspectorStats({ values: [], took: 0 });

    expect(stats.queryTime.value).toBe('0ms');
  });

  it('reports the query time and the documents processed', () => {
    const stats = getEsqlInspectorStats({ values: [[1]], took: 42, documents_found: 1000 });

    expect(stats.queryTime.value).toBe('42ms');
    expect(stats.documentsProcessed.value).toBe(1000);
  });
});
