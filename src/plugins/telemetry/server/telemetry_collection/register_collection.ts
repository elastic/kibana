/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TelemetryCollectionManagerPluginSetup } from '@kbn/telemetry-collection-manager-plugin/server';
import { getLocalStats } from './get_local_stats';
import { getClusterUuids } from './get_cluster_stats';

export function registerCollection(
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup
) {
  telemetryCollectionManager.setCollectionStrategy({
    title: 'local',
    priority: 0,
    statsGetter: getLocalStats,
    clusterDetailsGetter: getClusterUuids,
  });
}
