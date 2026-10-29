/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StatsDataStream, StorageIndex } from './resource_stats';
import { toResource, type DataManagementResource } from './sample_resources';

const MB = 1024 * 1024;

export interface SampleOverviewData {
  resources: DataManagementResource[];
  indices: StorageIndex[];
  dataStreams: StatsDataStream[];
  streamCount: number;
  viewCount: number;
  datasetCount: number;
  dataSourceTypes: string[];
}

/** One sample of each overview resource type, mixed in with live cluster data. */
export const sampleOverviewData = (): SampleOverviewData => ({
  resources: [
    toResource('sample-logs', 'index', 'open', undefined, 'green'),
    toResource('sample-logs-app', 'dataStream', undefined, undefined, 'green'),
    toResource('sample-web', 'stream'),
    toResource('sample-users', 'lookup', 'open', undefined, 'yellow'),
    toResource('sample-orders', 'dataset'),
    toResource('sample-errors', 'esqlView'),
    toResource('sample-products', 'vector', 'open', undefined, 'red'),
  ],
  indices: [
    { hidden: false, isFrozen: false, phase: 'hot', primarySize: 5 * MB, health: 'green' },
    {
      hidden: true,
      dataStream: 'sample-logs-app',
      isFrozen: false,
      phase: 'warm',
      primarySize: 4 * MB,
    },
    {
      hidden: false,
      mode: 'lookup',
      isFrozen: false,
      phase: 'cold',
      primarySize: 2 * MB,
      health: 'yellow',
    },
    { hidden: false, mode: 'vectordb_document', isFrozen: true, primarySize: MB, health: 'red' },
  ],
  dataStreams: [{ name: 'sample-logs-app', hidden: false, health: 'green' }],
  streamCount: 1,
  viewCount: 1,
  datasetCount: 1,
  dataSourceTypes: ['s3', 'snowflake'],
});
