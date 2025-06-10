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

export interface KibanaStatsDocument extends Fields {
  type: 'kibana_stats';
  cluster_uuid: string;
  'kibana_stats.kibana.name': string;
  'kibana_stats.kibana.uuid': string;
  'kibana_stats.kibana.index': string;
  'kibana_stats.timestamp'?: string;
  'kibana_stats.response_times.max'?: number;
  'kibana_stats.kibana.status'?: string;
  'kibana_stats.requests.disconnects'?: number;
  'kibana_stats.requests.total'?: number;
}

export class KibanaStats extends Serializable<KibanaStatsDocument> {
  timestamp(timestamp: number) {
    super.timestamp(timestamp);
    this.fields['kibana_stats.timestamp'] = new Date(timestamp).toISOString();
    return this;
  }

  status(status: string) {
    this.fields['kibana_stats.kibana.status'] = status;
  }

  responseTimes(max: number) {
    this.fields['kibana_stats.response_times.max'] = max;
  }

  requests(disconnects: number, total: number) {
    this.fields['kibana_stats.requests.disconnects'] = disconnects;
    this.fields['kibana_stats.requests.total'] = total;
    return this;
  }
}

export function kibanaStats(name: string, uuid: string, clusterUuid: string, index: string) {
  return new KibanaStats({
    type: 'kibana_stats',
    cluster_uuid: clusterUuid,
    'kibana_stats.kibana.name': name,
    'kibana_stats.kibana.uuid': uuid,
    'kibana_stats.kibana.index': index,
  });
}
