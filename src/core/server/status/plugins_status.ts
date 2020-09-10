/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, distinctUntilChanged, switchMap, debounceTime } from 'rxjs/operators';
import { isDeepStrictEqual } from 'util';

import { PluginName } from '../plugins';
import { ServiceStatus, CoreStatus } from './types';
import { getSummaryStatus } from './get_summary_status';

interface Deps {
  core$: Observable<CoreStatus>;
  pluginDependencies: ReadonlyMap<PluginName, PluginName[]>;
}

export class PluginsStatusService {
  private readonly pluginStatuses = new Map<PluginName, Observable<ServiceStatus>>();
  private readonly update$ = new BehaviorSubject(true);
  constructor(private readonly deps: Deps) {}

  public set(plugin: PluginName, status$: Observable<ServiceStatus>) {
    this.pluginStatuses.set(plugin, status$);
    this.update$.next(true); // trigger all existing Observables to update from the new source Observable
  }

  public getAll$(): Observable<Record<PluginName, ServiceStatus>> {
    return this.getPluginStatuses$([...this.deps.pluginDependencies.keys()]);
  }

  public getDependenciesStatus$(plugin: PluginName): Observable<Record<PluginName, ServiceStatus>> {
    const dependencies = this.deps.pluginDependencies.get(plugin);
    if (!dependencies) {
      throw new Error(`Unknown plugin: ${plugin}`);
    }

    return this.getPluginStatuses$(dependencies).pipe(
      // Prevent many emissions at once from dependency status resolution from making this too noisy
      debounceTime(500)
    );
  }

  public getDerivedStatus$(plugin: PluginName): Observable<ServiceStatus> {
    return combineLatest([this.deps.core$, this.getDependenciesStatus$(plugin)]).pipe(
      map(([coreStatus, pluginStatuses]) => {
        return getSummaryStatus(
          [...Object.entries(coreStatus), ...Object.entries(pluginStatuses)],
          {
            allAvailableSummary: `All dependencies are available`,
          }
        );
      })
    );
  }

  private getPluginStatuses$(plugins: PluginName[]): Observable<Record<PluginName, ServiceStatus>> {
    if (plugins.length === 0) {
      return of({});
    }

    return this.update$.pipe(
      switchMap(() => {
        const pluginStatuses = plugins
          .map(
            (depName) =>
              [depName, this.pluginStatuses.get(depName) ?? this.getDerivedStatus$(depName)] as [
                PluginName,
                Observable<ServiceStatus>
              ]
          )
          .map(([pName, status$]) =>
            status$.pipe(map((status) => [pName, status] as [PluginName, ServiceStatus]))
          );

        return combineLatest(pluginStatuses).pipe(
          map((statuses) => Object.fromEntries(statuses)),
          distinctUntilChanged(isDeepStrictEqual)
        );
      })
    );
  }
}
