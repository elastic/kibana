/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getListOfCCSIndices } from './utils';
import type { IndexAutocompleteItem } from '@kbn/esql-types';

describe('getListOfCCSIndices', () => {
  const createLookupItem = (indexName: string, aliases?: string[]): IndexAutocompleteItem => ({
    name: indexName,
    mode: 'lookup',
    aliases: aliases || [],
  });

  it('should return empty array when no clusters are provided', () => {
    const clusters: string[] = [];
    const lookupIndices = [
      createLookupItem('cluster1:index1'),
      createLookupItem('cluster2:index2'),
    ];
    const result = getListOfCCSIndices(clusters, lookupIndices);
    expect(result).toEqual([]);
  });

  it('should return empty array when no lookup indices are provided', () => {
    const clusters = ['cluster1', 'cluster2'];
    const lookupIndices: IndexAutocompleteItem[] = [];
    const result = getListOfCCSIndices(clusters, lookupIndices);
    expect(result).toEqual([]);
  });

  it('should return empty array when no indices match the specified clusters', () => {
    const clusters = ['cluster1', 'cluster2'];
    const lookupIndices = [
      createLookupItem('cluster3:index1'),
      createLookupItem('cluster4:index2'),
    ];
    const result = getListOfCCSIndices(clusters, lookupIndices);
    expect(result).toEqual([]);
  });

  it('should handle indices without cluster prefix', () => {
    const clusters = ['cluster1'];
    const lookupIndices = [
      createLookupItem('index1'),
      createLookupItem('cluster1:index2'),
      createLookupItem('index3'),
    ];
    const result = getListOfCCSIndices(clusters, lookupIndices);
    expect(result).toEqual([createLookupItem('index2')]);
  });

  it('should handle multiple indices in the same cluster', () => {
    const clusters = ['cluster1'];
    const lookupIndices = [
      createLookupItem('cluster1:index1', ['alias1']),
      createLookupItem('cluster1:index2'),
      createLookupItem('cluster1:index3'),
    ];
    const result = getListOfCCSIndices(clusters, lookupIndices);
    expect(result).toEqual([
      createLookupItem('index1', ['alias1']),
      createLookupItem('index2'),
      createLookupItem('index3'),
    ]);
  });

  it('should return empty array when no common indices exist across all clusters', () => {
    const clusters = ['cluster1', 'cluster2', 'cluster3'];
    const lookupIndices = [
      createLookupItem('cluster1:index1'),
      createLookupItem('cluster2:index2'),
      createLookupItem('cluster3:index3'),
    ];
    const result = getListOfCCSIndices(clusters, lookupIndices);
    expect(result).toEqual([]);
  });

  it('should find common indices across multiple clusters', () => {
    const clusters = ['cluster1', 'cluster2', 'cluster3'];
    const lookupIndices = [
      createLookupItem('cluster1:index1', ['alias1']),
      createLookupItem('cluster1:index2'),
      createLookupItem('cluster2:index1', ['alias2']),
      createLookupItem('cluster2:index3'),
      createLookupItem('cluster3:index1', ['alias1']), // alias1 is duplicated to test Set uniqueness
      createLookupItem('cluster3:index4'),
    ];
    const result = getListOfCCSIndices(clusters, lookupIndices);
    expect(result).toEqual([createLookupItem('index1', ['alias1', 'alias2'])]);
  });

  it('should handle malformed cluster:index patterns', () => {
    const clusters = ['cluster1'];
    const lookupIndices = [
      createLookupItem('cluster1:'),
      createLookupItem(':index1'),
      createLookupItem('cluster1:index2'),
      createLookupItem('notacluster'),
    ];
    const result = getListOfCCSIndices(clusters, lookupIndices);
    expect(result).toEqual([createLookupItem('index2')]);
  });

  it('should handle indices with complex names containing special characters', () => {
    const clusters = ['cluster1', 'cluster2'];
    const lookupIndices = [
      createLookupItem('cluster1:logs-2023.01.01'),
      createLookupItem('cluster1:metrics_system'),
      createLookupItem('cluster2:logs-2023.01.01'),
      createLookupItem('cluster2:traces.apm'),
    ];
    const result = getListOfCCSIndices(clusters, lookupIndices);
    expect(result).toEqual([createLookupItem('logs-2023.01.01')]);
  });
});
