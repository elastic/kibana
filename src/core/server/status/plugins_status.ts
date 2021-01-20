/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  private readonly defaultInheritedStatus$: Observable<ServiceStatus>;

  constructor(private readonly deps: Deps) {
    this.defaultInheritedStatus$ = this.deps.core$.pipe(
      map((coreStatus) => {
        return getSummaryStatus(Object.entries(coreStatus), {
          allAvailableSummary: `All dependencies are available`,
        });
      })
    );
  }

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
    return this.update$.pipe(
      switchMap(() => {
        // Only go up the dependency tree if any of this plugin's dependencies have a custom status
        // Helps eliminate memory overhead of creating thousands of Observables unnecessarily.
        if (this.anyCustomStatuses(plugin)) {
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
        } else {
          return this.defaultInheritedStatus$;
        }
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

  /**
   * Determines whether or not this plugin or any plugin in it's dependency tree have a custom status registered.
   */
  private anyCustomStatuses(plugin: PluginName): boolean {
    if (this.pluginStatuses.get(plugin)) {
      return true;
    }

    return this.deps.pluginDependencies
      .get(plugin)!
      .reduce((acc, depName) => acc || this.anyCustomStatuses(depName), false as boolean);
  }
}
