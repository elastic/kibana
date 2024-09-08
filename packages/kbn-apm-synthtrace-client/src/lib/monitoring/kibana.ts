/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Entity, Fields } from '../entity';
import { kibanaStats } from './kibana_stats';

interface KibanaDocument extends Fields {
  cluster_uuid: string;
  'kibana_stats.kibana.name': string;
  'kibana_stats.kibana.uuid': string;
  'kibana_stats.kibana.index': string;
}

export class Kibana extends Entity<KibanaDocument> {
  stats() {
    return kibanaStats(
      this.fields.cluster_uuid,
      this.fields['kibana_stats.kibana.name'],
      this.fields['kibana_stats.kibana.uuid'],
      this.fields['kibana_stats.kibana.index']
    );
  }
}

export function kibana(name: string, uuid: string, clusterUuid: string, index: string = '.kibana') {
  return new Kibana({
    cluster_uuid: clusterUuid,
    'kibana_stats.kibana.name': name,
    'kibana_stats.kibana.uuid': uuid,
    'kibana_stats.kibana.index': index,
  });
}
