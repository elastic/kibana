/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildResourceStats } from './resource_stats';
import { RESOURCE_TYPES } from './sample_resources';
import { sampleOverviewData } from './sample_overview_data';

describe('sampleOverviewData', () => {
  it('includes one resource of every type and counts each in the stats', () => {
    const sample = sampleOverviewData();
    const kinds = sample.resources.map((resource) => resource.kind).sort();

    expect(kinds).toEqual(RESOURCE_TYPES.map((type) => type.kind).sort());
    expect(sample.resources.find((resource) => resource.title === 'sample-logs')?.type).toBe(
      'Standard index'
    );
    expect(sample.resources.find((resource) => resource.title === 'sample-users')?.type).toBe(
      'Lookup index'
    );
    expect(sample.resources.find((resource) => resource.title === 'sample-products')?.type).toBe(
      'VectorDB index'
    );
    expect(sample.resources.find((resource) => resource.title === 'sample-products')?.health).toBe(
      'red'
    );
    expect(sample.resources.find((resource) => resource.title === 'sample-logs')?.health).toBe(
      'green'
    );
    expect(sample.resources.find((resource) => resource.title === 'sample-web')?.health).toBe(
      undefined
    );

    const stats = buildResourceStats({
      indices: sample.indices,
      dataStreams: sample.dataStreams,
      streamCount: sample.streamCount,
      viewCount: sample.viewCount,
      datasetCount: sample.datasetCount,
      dataSourceTypes: sample.dataSourceTypes,
    });

    expect(stats.counts).toEqual({
      indices: 1,
      dataStreams: 1,
      streams: 1,
      lookup: 1,
      federated: 1,
      views: 1,
      vector: 1,
    });
    expect(stats.resident).toMatchObject({
      known: true,
      hot: 5 * 1024 * 1024,
      warm: 4 * 1024 * 1024,
      cold: 2 * 1024 * 1024,
      frozen: 1024 * 1024,
    });
    expect(stats.federatedSources).toEqual(['s3', 'snowflake']);
    expect(stats.health).toEqual({ known: true, green: 2, yellow: 1, red: 1 });
  });
});
