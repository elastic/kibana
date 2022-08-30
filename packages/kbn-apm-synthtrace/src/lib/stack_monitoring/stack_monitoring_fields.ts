/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../entity';

export type StackMonitoringFields = Fields &
  Partial<{
    cluster_name: string;
    cluster_uuid: string;
    type: string;

    'cluster_stats.timestamp': string;
    'cluster_stats.indices.count': number;
    'license.status': string;

    'kibana_stats.kibana.name': string;
    'kibana_stats.kibana.uuid': string;
    'kibana_stats.kibana.status': string;
    'kibana_stats.kibana.index': string;
    'kibana_stats.requests.disconnects': number;
    'kibana_stats.requests.total': number;
    'kibana_stats.timestamp': string;
    'kibana_stats.response_times.max': number;
    timestamp: number;
  }>;
