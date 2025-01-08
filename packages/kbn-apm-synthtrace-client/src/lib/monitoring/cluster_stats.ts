/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Fields } from '../entity';
import { Serializable } from '../serializable';

export interface ClusterStatsDocument extends Fields {
  cluster_name: string;
  cluster_uuid: string;
  type: 'cluster_stats';
  'license.status'?: string;
  'cluster_stats.timestamp'?: string;
  'cluster_stats.indices.count'?: number;
}

export class ClusterStats extends Serializable<ClusterStatsDocument> {
  constructor(fields: ClusterStatsDocument) {
    super(fields);

    this.fields.type = 'cluster_stats';
    this.fields['license.status'] = 'active';
  }

  timestamp(timestamp: number) {
    super.timestamp(timestamp);
    this.fields['cluster_stats.timestamp'] = new Date(timestamp).toISOString();
    return this;
  }

  indices(count: number) {
    this.fields['cluster_stats.indices.count'] = count;
    return this;
  }
}

export function clusterStats(name: string, uuid: string) {
  return new ClusterStats({
    cluster_name: name,
    cluster_uuid: uuid,
    type: 'cluster_stats',
  });
}
