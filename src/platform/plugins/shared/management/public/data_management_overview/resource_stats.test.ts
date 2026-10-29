/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildResourceStats, type StatsDataStream, type StorageIndex } from './resource_stats';

const index = (overrides: Partial<StorageIndex> = {}): StorageIndex => ({
  hidden: false,
  isFrozen: false,
  primarySize: 0,
  ...overrides,
});

const dataStream = (overrides: Partial<StatsDataStream> = {}): StatsDataStream => ({
  name: 'logs',
  hidden: false,
  ...overrides,
});

describe('buildResourceStats', () => {
  it('counts lookup and vector separately from indices and data streams', () => {
    const stats = buildResourceStats({
      indices: [
        index({ primarySize: 10 }),
        index({ mode: 'lookup', primarySize: 5 }),
        index({ mode: 'vectordb_document', primarySize: 7 }),
        index({ hidden: true, primarySize: 100 }),
        index({ dataStream: 'logs', hidden: true, phase: 'warm', primarySize: 20 }),
      ],
      dataStreams: [
        dataStream({ name: 'logs' }),
        dataStream({ name: 'lookup-ds', indexMode: 'lookup' }),
        dataStream({ name: 'system', hidden: true }),
      ],
      streamCount: 2,
      viewCount: 3,
      datasetCount: 4,
      dataSourceTypes: ['s3', 's3', 'snowflake'],
    });

    expect(stats.counts).toEqual({
      indices: 1,
      dataStreams: 1,
      lookup: 2,
      federated: 4,
      views: 3,
      vector: 1,
      streams: 2,
    });
    expect(stats.total).toBe(14);
    expect(stats.federatedSources).toEqual(['s3', 'snowflake']);
  });

  it('buckets resident bytes by ILM phase and skips hidden data streams', () => {
    const stats = buildResourceStats({
      indices: [
        index({ primarySize: 100 }),
        index({ phase: 'hot', primarySize: 40 }),
        index({ phase: 'warm', primarySize: 30 }),
        index({ phase: 'cold', primarySize: 20 }),
        index({ isFrozen: true, phase: 'hot', primarySize: 10 }),
        index({ hidden: true, primarySize: 999 }),
        index({ dataStream: 'logs', hidden: true, phase: 'warm', primarySize: 15 }),
        index({ dataStream: 'system', hidden: true, phase: 'hot', primarySize: 500 }),
      ],
      dataStreams: [dataStream({ name: 'logs' }), dataStream({ name: 'system', hidden: true })],
      streamCount: 0,
      viewCount: 0,
      datasetCount: 0,
      dataSourceTypes: [],
    });

    expect(stats.resident).toEqual({
      known: true,
      hot: 140,
      warm: 45,
      cold: 20,
      frozen: 10,
    });
  });

  it('marks resident storage unknown when sizes are missing', () => {
    const stats = buildResourceStats({
      indices: [index({ primarySize: undefined })],
      dataStreams: [],
      streamCount: 0,
      viewCount: 0,
      datasetCount: 0,
      dataSourceTypes: [],
    });

    expect(stats.resident.known).toBe(false);
    expect(stats.resident.hot).toBe(0);
  });

  it('counts health for visible indices and data streams', () => {
    const stats = buildResourceStats({
      indices: [
        index({ health: 'green' }),
        index({ health: 'yellow' }),
        index({ health: 'red', hidden: true }),
        index({ dataStream: 'logs', hidden: true, health: 'red' }),
      ],
      dataStreams: [
        dataStream({ name: 'logs', health: 'yellow' }),
        dataStream({ name: 'system', hidden: true, health: 'red' }),
      ],
      streamCount: 1,
      viewCount: 1,
      datasetCount: 1,
      dataSourceTypes: [],
    });

    expect(stats.health).toEqual({ known: true, green: 1, yellow: 2, red: 0 });
  });
});
