/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { ChangedDeprecatedPaths } from '@kbn/config';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { MetricsServiceSetup } from '@kbn/core-metrics-server';
import type {
  CoreUsageData,
  CoreUsageDataStart,
  ConfigUsageData,
} from '@kbn/core-usage-data-server';
import { type InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import { type SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
export type ExposedConfigsToUsage = Map<string, Record<string, boolean>>;
export interface SetupDeps {
  http: InternalHttpServiceSetup;
  metrics: MetricsServiceSetup;
  savedObjectsStartPromise: Promise<SavedObjectsServiceStart>;
  changedDeprecatedConfigPath$: Observable<ChangedDeprecatedPaths>;
}
export interface StartDeps {
  savedObjects: SavedObjectsServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  exposedConfigsToUsage: ExposedConfigsToUsage;
}
export declare class CoreUsageDataService
  implements CoreService<InternalCoreUsageDataSetup, CoreUsageDataStart>
{
  private logger;
  private elasticsearchConfig?;
  private configService;
  private httpConfig?;
  private loggingConfig?;
  private soConfig?;
  private stop$;
  private opsMetrics?;
  private coreUsageStatsClient?;
  private deprecatedConfigPaths;
  private incrementUsageCounter;
  private deprecatedApiUsageFetcher;
  constructor(core: CoreContext);
  private getSavedObjectUsageData;
  private getSavedObjectIndicesUsageData;
  private getSavedObjectAliasUsageData;
  private getCoreUsageData;
  private getMarkedAsSafe;
  private getNonDefaultKibanaConfigs;
  setup({
    http,
    metrics,
    savedObjectsStartPromise,
    changedDeprecatedConfigPath$,
  }: SetupDeps): InternalCoreUsageDataSetup;
  start({ savedObjects, elasticsearch, exposedConfigsToUsage }: StartDeps): {
    getCoreUsageData: () => Promise<CoreUsageData>;
    getConfigsUsageData: () => Promise<ConfigUsageData>;
  };
  stop(): void;
}
