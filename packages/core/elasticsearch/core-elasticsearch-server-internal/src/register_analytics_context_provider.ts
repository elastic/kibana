/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { ClusterInfo } from './get_cluster_info';

/**
 * Registers the Analytics context provider to enrich events with the cluster info.
 * @param analytics Analytics service.
 * @param context$ Observable emitting the cluster info.
 * @private
 */
export function registerAnalyticsContextProvider(
  analytics: AnalyticsServiceSetup,
  context$: Observable<ClusterInfo>
) {
  analytics.registerContextProvider({
    name: 'elasticsearch info',
    context$,
    schema: {
      cluster_name: { type: 'keyword', _meta: { description: 'The Cluster Name' } },
      cluster_uuid: { type: 'keyword', _meta: { description: 'The Cluster UUID' } },
      cluster_version: { type: 'keyword', _meta: { description: 'The Cluster version' } },
      cluster_build_flavor: {
        type: 'keyword',
        _meta: { description: 'The Cluster build flavor', optional: true },
      },
    },
  });
}
