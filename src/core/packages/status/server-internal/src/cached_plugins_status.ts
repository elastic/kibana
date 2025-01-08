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

export class PluginsStatusService extends BasePluginsStatusService {
  private all$?: Observable<Record<PluginName, PluginStatus>>;
  private dependenciesStatuses$: Record<PluginName, Observable<Record<PluginName, PluginStatus>>>;
  private derivedStatuses$: Record<PluginName, Observable<PluginStatus>>;

  constructor(deps: Deps) {
    super(deps);
    this.dependenciesStatuses$ = {};
    this.derivedStatuses$ = {};
  }

  public getAll$(): Observable<Record<PluginName, PluginStatus>> {
    if (!this.all$) {
      this.all$ = super.getAll$();
    }

    return this.all$;
  }

  public getDependenciesStatus$(plugin: PluginName): Observable<Record<PluginName, PluginStatus>> {
    if (!this.dependenciesStatuses$[plugin]) {
      this.dependenciesStatuses$[plugin] = super.getDependenciesStatus$(plugin);
    }

    return this.dependenciesStatuses$[plugin];
  }

  public getDerivedStatus$(plugin: PluginName): Observable<PluginStatus> {
    if (!this.derivedStatuses$[plugin]) {
      this.derivedStatuses$[plugin] = super.getDerivedStatus$(plugin);
    }

    return this.derivedStatuses$[plugin];
  }
}
