/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Entity } from '../entity';
import { generateShortId } from '../utils/generate_id';
import { Kibana } from './kibana';
import { StackMonitoringFields } from './stack_monitoring_fields';

export class Cluster extends Entity<StackMonitoringFields> {
  kibana(name: string, index: string = '.kibana') {
    return new Kibana({
      ...this.fields,
      'kibana_stats.kibana.name': name,
      'kibana_stats.kibana.index': index,
      type: 'kibana_stats',
    });
  }
}

export function cluster() {
  return new Cluster({
    cluster_uuid: generateShortId(),
  });
}
