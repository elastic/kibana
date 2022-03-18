/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializerContext } from 'src/core/public';
import type { TelemetryPluginConfig } from './plugin';
import { TelemetryPlugin } from './plugin';
export type {
  TelemetryConstants,
  TelemetryPluginStart,
  TelemetryPluginSetup,
  TelemetryPluginConfig,
  TelemetryServicePublicApis,
} from './plugin';

export function plugin(initializerContext: PluginInitializerContext<TelemetryPluginConfig>) {
  return new TelemetryPlugin(initializerContext);
}
