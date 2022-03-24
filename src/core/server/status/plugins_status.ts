/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  pluck,
  filter,
  debounceTime,
  bufferTime,
  timeoutWith,
  startWith,
} from 'rxjs/operators';
import { sortBy } from 'lodash';

import { type PluginName } from '../plugins';
import { type ServiceStatus, type CoreStatus, ServiceStatusLevels } from './types';
import { getSummaryStatus } from './get_summary_status';

const STATUS_TIMEOUT_MS = 30 * 1000; // 30 seconds

const defaultStatus: ServiceStatus = {
  level: ServiceStatusLevels.unavailable,
  summary: `Status check timed out after ${STATUS_TIMEOUT_MS / 1000}s`,
};

export interface Deps {
  core$: Observable<CoreStatus>;
  pluginDependencies: ReadonlyMap<PluginName, PluginName[]>;
}

interface PluginData {
  [name: PluginName]: {
    name: PluginName;
    depth: number;
    dependencies: PluginName[];
    reverseDependencies: PluginName[];
    reportedStatus?: ServiceStatus;
    derivedStatus: ServiceStatus;
  };
}
interface PluginStatus {
  [name: PluginName]: ServiceStatus;
}

interface PluginReportedStatus {
  [name: PluginName]: Subscription;
}

export class PluginsStatusService {
  private coreStatus: CoreStatus = { elasticsearch: defaultStatus, savedObjects: defaultStatus };
  private pluginData: PluginData;
  private rootPlugins: PluginName[];
  private orderedPluginNames: PluginName[];
  private pluginData$ = new ReplaySubject<PluginData>(1);
  private pluginStatus: PluginStatus = {};
  private pluginStatus$ = new ReplaySubject<PluginStatus>(1);
  private pluginReportedStatus: PluginReportedStatus = {};
  private updatePluginStatuses$ = new Subject<PluginName>();
  private newRegistrationsAllowed = true;

  constructor(private readonly deps: Deps) {
    this.pluginData = this.initPluginData(deps.pluginDependencies);
    this.rootPlugins = this.getRootPlugins();
    this.orderedPluginNames = this.getOrderedPluginNames();

    this.updatePluginStatuses$
      .asObservable()
      .pipe(
        bufferTime(25),
        filter((plugins) => plugins.length > 0)
      )
      .subscribe((plugins) => {
        this.updatePluginsStatuses(plugins);
        this.pluginData$.next(this.pluginData);
        this.pluginStatus$.next(this.pluginStatus);
      });

    this.deps.core$.pipe(debounceTime(25)).subscribe((coreStatus) => {
      this.coreStatus = coreStatus!;
      const derivedStatus = getSummaryStatus(Object.entries(this.coreStatus), {
        allAvailableSummary: `All dependencies are available`,
      });

      this.rootPlugins.forEach((plugin) => {
        this.pluginData[plugin].derivedStatus = derivedStatus;
        if (!this.pluginReportedStatus[plugin]) {
          // this root plugin has NOT registered any status Observable. Thus, its status is derived from core
          this.pluginStatus[plugin] = derivedStatus;
        }

        this.updatePluginStatuses$.next(plugin);
      });
    });
  }

  public set(plugin: PluginName, status$: Observable<ServiceStatus>) {
    if (!this.newRegistrationsAllowed) {
      throw new Error(
        `Custom statuses cannot be registered after setup, plugin [${plugin}] attempted`
      );
    }

    const subscription = this.pluginReportedStatus[plugin];
    if (subscription) subscription.unsubscribe();

    this.pluginReportedStatus[plugin] = status$
      // Set a timeout for custom status Observables
      .pipe(timeoutWith(STATUS_TIMEOUT_MS, status$.pipe(startWith(defaultStatus))))
      .subscribe((status) => {
        const previousReportedLevel = this.pluginData[plugin].reportedStatus?.level;

        this.pluginData[plugin].reportedStatus = status;
        this.pluginStatus[plugin] = status;

        if (status.level !== previousReportedLevel) {
          this.updatePluginStatuses$.next(plugin);
        }
      });

    // delete any derived statuses calculated before the custom status observable was registered
    delete this.pluginStatus[plugin];
  }

  public blockNewRegistrations() {
    this.newRegistrationsAllowed = false;
  }

  public getAll$(): Observable<Record<PluginName, ServiceStatus>> {
    return this.pluginStatus$.asObservable().pipe(
      // do not emit until we have a status for all plugins
      filter((all) => Object.keys(all).length === this.orderedPluginNames.length)
    );
  }

  public getDependenciesStatus$(plugin: PluginName): Observable<Record<PluginName, ServiceStatus>> {
    const directDependencies = this.pluginData[plugin].dependencies;

    return this.getAll$().pipe(
      map((allStatus) =>
        Object.keys(allStatus)
          .filter((dep) => directDependencies.includes(dep))
          .reduce((acc: PluginStatus, key: PluginName) => {
            acc[key] = allStatus[key];
            return acc;
          }, {})
      ),
      distinctUntilChanged()
    );
  }

  public getDerivedStatus$(plugin: PluginName): Observable<ServiceStatus> {
    return this.pluginData$.asObservable().pipe(
      pluck(plugin, 'derivedStatus'),
      filter((status: ServiceStatus | undefined): status is ServiceStatus => !!status),
      distinctUntilChanged()
    );
  }

  private initPluginData(pluginDependencies: ReadonlyMap<PluginName, PluginName[]>): PluginData {
    const pluginData: PluginData = {};

    if (pluginDependencies) {
      pluginDependencies.forEach((dependencies, name) => {
        pluginData[name] = {
          name,
          depth: 0,
          dependencies,
          reverseDependencies: [],
          derivedStatus: defaultStatus,
        };
      });

      pluginDependencies.forEach((dependencies, name) => {
        dependencies.forEach((dependency) => {
          pluginData[dependency].reverseDependencies.push(name);
        });
      });
    }

    return pluginData;
  }

  private getRootPlugins(): PluginName[] {
    return Object.keys(this.pluginData).filter(
      (plugin) => this.pluginData[plugin].dependencies.length === 0
    );
  }

  private getOrderedPluginNames(): PluginName[] {
    this.rootPlugins.forEach((plugin) => {
      this.calculateDepthRecursive(plugin, 1);
    });

    return sortBy(Object.values(this.pluginData), ['depth', 'name']).map(({ name }) => name);
  }

  private calculateDepthRecursive(plugin: PluginName, depth: number) {
    const pluginData = this.pluginData[plugin];
    pluginData.depth = Math.max(pluginData.depth, depth);
    const newDepth = depth + 1;
    pluginData.reverseDependencies.forEach((revDep) =>
      this.calculateDepthRecursive(revDep, newDepth)
    );
  }

  private updatePluginStatus(plugin: PluginName): void {
    const newStatus = this.determinePluginStatus(plugin);
    const pluginData = this.pluginData[plugin];
    pluginData.derivedStatus = newStatus;

    if (!this.pluginReportedStatus[plugin]) {
      // this plugin has NOT registered any status Observable. Thus, its status is derived from its dependencies + core
      this.pluginStatus[plugin] = newStatus;
    }
  }

  private updatePluginsStatuses(plugins: PluginName[]): void {
    const toCheck = new Set<PluginName>(plugins);
    for (let i = 0; i < this.orderedPluginNames.length && toCheck.size > 0; ++i) {
      const current = this.orderedPluginNames[i];
      if (toCheck.has(current)) {
        // update the current plugin status
        this.updatePluginStatus(current);
        // flag all its reverse dependencies to be checked
        this.pluginData[current].reverseDependencies.forEach((revDep) => toCheck.add(revDep));
      }
    }
  }

  private determinePluginStatus(plugin: PluginName): ServiceStatus {
    const coreStatus: Array<[PluginName, ServiceStatus]> = Object.entries(this.coreStatus);
    const depsStatus: Array<[PluginName, ServiceStatus]> = this.pluginData[plugin].dependencies.map(
      (dependency) => [
        dependency,
        this.pluginData[dependency].reportedStatus || this.pluginData[dependency].derivedStatus,
      ]
    );

    const newStatus = getSummaryStatus([...coreStatus, ...depsStatus], {
      allAvailableSummary: `All dependencies are available`,
    });

    return newStatus;
  }
}
