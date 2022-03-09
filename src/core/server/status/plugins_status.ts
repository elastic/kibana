/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  switchMap,
  debounceTime,
  timeoutWith,
  startWith,
} from 'rxjs/operators';
import { isDeepStrictEqual } from 'util';

import { PluginName } from '../plugins';
import { ServiceStatus, CoreStatus, ServiceStatusLevels } from './types';
import { getSummaryStatus } from './get_summary_status';

const STATUS_TIMEOUT_MS = 30 * 1000; // 30 seconds

interface Deps {
  core$: Observable<CoreStatus>;
  pluginDependencies: ReadonlyMap<PluginName, PluginName[]>;
}

export class PluginsStatusService {
  private readonly pluginStatuses = new Map<PluginName, Observable<ServiceStatus>>();
  private readonly derivedStatuses = new Map<PluginName, Observable<ServiceStatus>>();
  private readonly dependenciesStatuses = new Map<
    PluginName,
    Observable<Record<PluginName, ServiceStatus>>
  >();
  private allPluginsStatuses?: Observable<Record<PluginName, ServiceStatus>>;

  private readonly update$ = new BehaviorSubject(true);
  private readonly defaultInheritedStatus$: Observable<ServiceStatus>;
  private newRegistrationsAllowed = true;

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
    if (!this.newRegistrationsAllowed) {
      throw new Error(
        `Custom statuses cannot be registered after setup, plugin [${plugin}] attempted`
      );
    }
    this.pluginStatuses.set(plugin, status$);
    this.update$.next(true); // trigger all existing Observables to update from the new source Observable
  }

  public blockNewRegistrations() {
    this.newRegistrationsAllowed = false;
  }

  public getAll$(): Observable<Record<PluginName, ServiceStatus>> {
    if (!this.allPluginsStatuses) {
      this.allPluginsStatuses = this.getPluginStatuses$([...this.deps.pluginDependencies.keys()]);
    }
    return this.allPluginsStatuses;
  }

  public getDependenciesStatus$(plugin: PluginName): Observable<Record<PluginName, ServiceStatus>> {
    const dependencies = this.deps.pluginDependencies.get(plugin);
    if (!dependencies) {
      throw new Error(`Unknown plugin: ${plugin}`);
    }
    if (!this.dependenciesStatuses.has(plugin)) {
      this.dependenciesStatuses.set(
        plugin,
        this.getPluginStatuses$(dependencies).pipe(
          // Prevent many emissions at once from dependency status resolution from making this too noisy
          debounceTime(25)
        )
      );
    }
    return this.dependenciesStatuses.get(plugin)!;
  }

  public getDerivedStatus$(plugin: PluginName): Observable<ServiceStatus> {
    if (!this.derivedStatuses.has(plugin)) {
      this.derivedStatuses.set(
        plugin,
        this.update$.pipe(
          debounceTime(25), // Avoid calling the plugin's custom status logic for every plugin that depends on it.
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
        )
      );
    }
    return this.derivedStatuses.get(plugin)!;
  }

  private getPluginStatuses$(plugins: PluginName[]): Observable<Record<PluginName, ServiceStatus>> {
    if (plugins.length === 0) {
      return of({});
    }

    return this.update$.pipe(
      switchMap(() => {
        const pluginStatuses = plugins
          .map((depName) => {
            const pluginStatus = this.pluginStatuses.get(depName)
              ? this.pluginStatuses.get(depName)!.pipe(
                  timeoutWith(
                    STATUS_TIMEOUT_MS,
                    this.pluginStatuses.get(depName)!.pipe(
                      startWith({
                        level: ServiceStatusLevels.unavailable,
                        summary: `Status check timed out after ${STATUS_TIMEOUT_MS / 1000}s`,
                      })
                    )
                  )
                )
              : this.getDerivedStatus$(depName);
            return [depName, pluginStatus] as [PluginName, Observable<ServiceStatus>];
          })
          .map(([pName, status$]) =>
            status$.pipe(map((status) => [pName, status] as [PluginName, ServiceStatus]))
          );

        return combineLatest(pluginStatuses).pipe(
          map((statuses) => Object.fromEntries(statuses)),
          distinctUntilChanged<Record<PluginName, ServiceStatus>>(isDeepStrictEqual)
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
