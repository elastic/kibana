/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { omit } from 'lodash';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ISavedObjectsRepository, KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import { StatsCollectionContext } from 'src/plugins/telemetry_collection_manager/server';
import { ElasticsearchClient } from 'src/core/server';

export interface KibanaUsageStats {
  kibana: {
    index: string;
  };
  kibana_stats: {
    os: {
      // These should be provided
      platform: string | undefined;
      platformRelease: string | undefined;
      // The ones below are really optional
      distro?: string;
      distroRelease?: string;
    };
  };

  [plugin: string]: any;
}

export function handleKibanaStats(
  { logger, version: serverVersion }: StatsCollectionContext,
  response?: KibanaUsageStats
) {
  if (!response) {
    logger.warn('No Kibana stats returned from usage collectors');
    return;
  }
  const { kibana, kibana_stats: kibanaStats, ...plugins } = response;

  const os = {
    platform: 'unknown',
    platformRelease: 'unknown',
    ...kibanaStats.os,
  };
  const formattedOsStats = Object.entries(os).reduce((acc, [key, value]) => {
    if (typeof value !== 'string') {
      // There are new fields reported now from the "os" property like "load", "memory", etc. They are objects.
      return acc;
    }
    return {
      ...acc,
      [`${key}s`]: [{ [key]: value, count: 1 }],
    };
  }, {});

  const version = serverVersion.replace(/-snapshot/i, ''); // Shouldn't we better maintain the -snapshot so we can differentiate between actual final releases and snapshots?

  // combine core stats (os types, saved objects) with plugin usage stats
  // organize the object into the same format as monitoring-enabled telemetry
  return {
    ...omit(kibana, 'index'), // discard index
    count: 1,
    indices: 1,
    os: formattedOsStats,
    versions: [{ version, count: 1 }],
    plugins,
  };
}

export async function getKibana(
  usageCollection: UsageCollectionSetup,
  asInternalUser: ElasticsearchClient,
  soClient: SavedObjectsClientContract | ISavedObjectsRepository,
  kibanaRequest: KibanaRequest | undefined // intentionally `| undefined` to enforce providing the parameter
): Promise<KibanaUsageStats> {
  const usage = await usageCollection.bulkFetch(asInternalUser, soClient, kibanaRequest);
  return usageCollection.toObject(usage);
}
