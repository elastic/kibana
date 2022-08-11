/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import type { TelemetryConfigType } from './config';
import { TelemetryPlugin } from './plugin';

export { config } from './config';
export type { TelemetryPluginSetup, TelemetryPluginStart } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext<TelemetryConfigType>) =>
  new TelemetryPlugin(initializerContext);
export { getClusterUuids, getLocalStats } from './telemetry_collection';

export type {
  TelemetryLocalStats,
  DataTelemetryPayload,
  DataTelemetryDocument,
  DataTelemetryBasePayload,
  NodeUsage,
} from './telemetry_collection';
