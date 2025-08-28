/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getListOfCCSResources } from './utils';

describe('getListOfCCSResources', () => {
  it('should return empty array when no clusters are provided', () => {
    const clusters: string[] = [];
    const lookupIndices = ['cluster1:index1', 'cluster2:index2'];
    const result = getListOfCCSResources(clusters, lookupIndices);
    expect(result).toEqual([]);
  });

  it('should return empty array when no lookup indices are provided', () => {
    const clusters = ['cluster1', 'cluster2'];
    const lookupIndices: string[] = [];
    const result = getListOfCCSResources(clusters, lookupIndices);
    expect(result).toEqual([]);
  });

  it('should return empty array when no indices match the specified clusters', () => {
    const clusters = ['cluster1', 'cluster2'];
    const lookupIndices = ['cluster3:index1', 'cluster4:index2'];
    const result = getListOfCCSResources(clusters, lookupIndices);
    expect(result).toEqual([]);
  });

  it('should handle indices without cluster prefix', () => {
    const clusters = ['cluster1'];
    const lookupIndices = ['index1', 'cluster1:index2', 'index3'];
    const result = getListOfCCSResources(clusters, lookupIndices);
    expect(result).toEqual(['index2']);
  });

  it('should handle multiple indices in the same cluster', () => {
    const clusters = ['cluster1'];
    const lookupIndices = ['cluster1:index1', 'cluster1:index2', 'cluster1:index3'];
    const result = getListOfCCSResources(clusters, lookupIndices);
    expect(result).toEqual(['index1', 'index2', 'index3']);
  });

  it('should return empty array when no common indices exist across all clusters', () => {
    const clusters = ['cluster1', 'cluster2', 'cluster3'];
    const lookupIndices = ['cluster1:index1', 'cluster2:index2', 'cluster3:index3'];
    const result = getListOfCCSResources(clusters, lookupIndices);
    expect(result).toEqual([]);
  });

  it('should find common indices across multiple clusters', () => {
    const clusters = ['cluster1', 'cluster2', 'cluster3'];
    const lookupIndices = [
      'cluster1:index1',
      'cluster1:index2',
      'cluster2:index1',
      'cluster2:index3',
      'cluster3:index1',
      'cluster3:index4',
    ];
    const result = getListOfCCSResources(clusters, lookupIndices);
    expect(result).toEqual(['index1']);
  });

  it('should handle malformed cluster:index patterns', () => {
    const clusters = ['cluster1'];
    const lookupIndices = ['cluster1:', ':index1', 'cluster1:index2', 'notacluster'];
    const result = getListOfCCSResources(clusters, lookupIndices);
    expect(result).toEqual(['index2']);
  });

  it('should handle indices with complex names containing special characters', () => {
    const clusters = ['cluster1', 'cluster2'];
    const lookupIndices = [
      'cluster1:logs-2023.01.01',
      'cluster1:metrics_system',
      'cluster2:logs-2023.01.01',
      'cluster2:traces.apm',
    ];
    const result = getListOfCCSResources(clusters, lookupIndices);
    expect(result).toEqual(['logs-2023.01.01']);
  });
});
