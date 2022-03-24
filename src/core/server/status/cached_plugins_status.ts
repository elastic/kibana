/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';

import { type PluginName } from '../plugins';
import { type ServiceStatus } from './types';

import { type Deps, PluginsStatusService as BasePluginsStatusService } from './plugins_status';

export class PluginsStatusService extends BasePluginsStatusService {
  private all$?: Observable<Record<PluginName, ServiceStatus>>;
  private dependenciesStatuses$: Record<PluginName, Observable<Record<PluginName, ServiceStatus>>>;
  private derivedStatuses$: Record<PluginName, Observable<ServiceStatus>>;

  constructor(deps: Deps) {
    super(deps);
    this.dependenciesStatuses$ = {};
    this.derivedStatuses$ = {};
  }

  public getAll$(): Observable<Record<PluginName, ServiceStatus>> {
    if (!this.all$) {
      this.all$ = super.getAll$();
    }

    return this.all$;
  }

  public getDependenciesStatus$(plugin: PluginName): Observable<Record<PluginName, ServiceStatus>> {
    if (!this.dependenciesStatuses$[plugin]) {
      this.dependenciesStatuses$[plugin] = super.getDependenciesStatus$(plugin);
    }

    return this.dependenciesStatuses$[plugin];
  }

  public getDerivedStatus$(plugin: PluginName): Observable<ServiceStatus> {
    if (!this.derivedStatuses$[plugin]) {
      this.derivedStatuses$[plugin] = super.getDerivedStatus$(plugin);
    }

    return this.derivedStatuses$[plugin];
  }
}
