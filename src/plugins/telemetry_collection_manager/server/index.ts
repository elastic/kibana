/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { TelemetryCollectionManagerPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new TelemetryCollectionManagerPlugin(initializerContext);
}

export type {
  TelemetryCollectionManagerPluginSetup,
  TelemetryCollectionManagerPluginStart,
  StatsCollectionConfig,
  StatsGetter,
  StatsGetterConfig,
  StatsCollectionContext,
  ClusterDetails,
  ClusterDetailsGetter,
  UsageStatsPayload,
} from './types';
