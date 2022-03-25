/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Serializable } from '../serializable';
import { StackMonitoringFields } from './stack_monitoring_fields';

export class KibanaStats extends Serializable<StackMonitoringFields> {
  timestamp(timestamp: number): this {
    this.fields['kibana_stats.timestamp'] = new Date(timestamp).toISOString();
    this.fields['kibana_stats.response_times.max'] = 250;
    this.fields['kibana_stats.kibana.status'] = 'green';
    this.fields.timestamp = timestamp;
    return this;
  }

  requests(disconnects: number, total: number): this {
    this.fields['kibana_stats.requests.disconnects'] = disconnects;
    this.fields['kibana_stats.requests.total'] = total;
    return this;
  }
}
