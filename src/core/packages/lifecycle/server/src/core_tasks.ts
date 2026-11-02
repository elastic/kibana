/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from './core_setup';
import type { CoreStart } from './core_start';

/**
 * Core services available to the `server/tasks` entry of a plugin during `setup`.
 *
 * Task runtimes (Kibana and task pods) only register and run task code: there is no HTTP server,
 * no routes, no status or deprecations. Everything here is a subset of {@link CoreSetup}, so a
 * tasks entry can only use what a pod can provide.
 *
 * @public
 */
export interface CoreTasksSetup<TPluginsStart extends object = object, TStart = unknown> {
  analytics: Pick<CoreSetup['analytics'], 'optIn' | 'registerEventType' | 'reportEvent'>;
  http: Pick<CoreSetup['http'], 'basePath'>;
  injection: Pick<CoreSetup['injection'], 'getContainer'>;
  savedObjects: Pick<
    CoreSetup['savedObjects'],
    'registerType' | 'setEncryptionExtension' | 'getDefaultIndex'
  >;
  getStartServices(): Promise<[CoreTasksStart, TPluginsStart, TStart]>;
}

/**
 * Core services available to the `server/tasks` entry of a plugin during `start`.
 *
 * @public
 */
export interface CoreTasksStart {
  analytics: Pick<CoreStart['analytics'], 'optIn' | 'reportEvent' | 'telemetryCounter$'>;
  elasticsearch: Pick<CoreStart['elasticsearch'], 'client' | 'createClient'>;
  featureFlags: CoreStart['featureFlags'];
  http: Pick<CoreStart['http'], 'basePath' | 'getServerInfo'>;
  injection: Pick<CoreStart['injection'], 'getContainer' | 'fork'>;
  savedObjects: Omit<CoreStart['savedObjects'], 'createExporter' | 'createImporter'>;
  security: CoreStart['security'];
  uiSettings: CoreStart['uiSettings'];
  userProfile: CoreStart['userProfile'];
}
