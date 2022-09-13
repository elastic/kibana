/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StackMonitoringFields } from './stack_monitoring_fields';
import { Signal } from '../signal';
import { index, WriteTarget } from '../write_target';

export class ClusterStats extends Signal<StackMonitoringFields> {
  constructor(fields: StackMonitoringFields) {
    super(fields);

    this.fields.type = 'cluster_stats';
    this.fields['license.status'] = 'active';
  }

  timestamp(timestamp: number): this {
    super.timestamp(timestamp);
    this.fields['cluster_stats.timestamp'] = new Date(timestamp).toISOString();
    return this;
  }

  indices(count: number): this {
    this.fields['cluster_stats.indices.count'] = count;
    return this;
  }

  getWriteTarget(): WriteTarget | undefined {
    return index('.monitoring-es-7-synthtrace');
  }
}
