/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { PluginName } from '@kbn/core-base-common';
import { type Deps, PluginsStatusService as BasePluginsStatusService } from './plugins_status';
import type { PluginStatus } from './types';
export declare class PluginsStatusService extends BasePluginsStatusService {
  private all$?;
  private dependenciesStatuses$;
  private derivedStatuses$;
  constructor(deps: Deps);
  getAll$(): Observable<Record<PluginName, PluginStatus>>;
  getDependenciesStatus$(plugin: PluginName): Observable<Record<PluginName, PluginStatus>>;
  getDerivedStatus$(plugin: PluginName): Observable<PluginStatus>;
}
