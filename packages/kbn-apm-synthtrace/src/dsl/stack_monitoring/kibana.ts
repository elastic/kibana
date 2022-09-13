/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StackMonitoringFields } from './stack_monitoring_fields';
import { KibanaStats } from './kibana_stats';
import { Entity } from '../entity';

export class Kibana extends Entity<StackMonitoringFields> {
  constructor(fields: StackMonitoringFields) {
    super(fields);
  }
  stats() {
    return new KibanaStats({
      ...this.fields,
    });
  }
}
