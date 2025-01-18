/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Entity, Fields } from '../entity';
import { generateShortId } from '../utils/generate_id';
import { clusterStats } from './cluster_stats';
import { kibana } from './kibana';

interface ClusterDocument extends Fields {
  cluster_name: string;
  cluster_uuid: string;
}

class Cluster extends Entity<ClusterDocument> {
  stats() {
    return clusterStats(this.fields.cluster_name, this.fields.cluster_uuid);
  }

  kibana(name: string, index: string = '.kibana') {
    return kibana(name, generateShortId(), this.fields.cluster_uuid, index);
  }
}

export function cluster(name: string) {
  return new Cluster({
    cluster_name: name,
    cluster_uuid: generateShortId(),
  });
}
