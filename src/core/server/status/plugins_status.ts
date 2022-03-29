/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { BehaviorSubject, Observable, ReplaySubject, Subscription } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  filter,
  debounceTime,
  timeoutWith,
  startWith,
} from 'rxjs/operators';
import { sortBy, isEqual } from 'lodash';
import { isDeepStrictEqual } from 'util';

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
    depth: number; // depth of this plugin in the dependency tree (root plugins will have depth = 1)
    dependencies: PluginName[];
    reverseDependencies: PluginName[];
    reportedStatus?: ServiceStatus;
    derivedStatus: ServiceStatus;
  };
}
interface PluginStatus {
  [name: PluginName]: ServiceStatus;
}

interface ReportedStatusSubscriptions {
  [name: PluginName]: Subscription;
}

export class PluginsStatusService {
  private coreStatus: CoreStatus = { elasticsearch: defaultStatus, savedObjects: defaultStatus };
  private pluginData: PluginData;
  private rootPlugins: PluginName[]; // root plugins are those that do not have any dependencies
  private orderedPluginNames: PluginName[];
  private pluginData$ = new ReplaySubject<PluginData>(1);
  private pluginStatus: PluginStatus = {};
  private pluginStatus$ = new BehaviorSubject<PluginStatus>(this.pluginStatus);
  private reportedStatusSubscriptions: ReportedStatusSubscriptions = {};
  private isReportingStatus: Record<PluginName, boolean> = {};
  private newRegistrationsAllowed = true;
  private coreSubscription: Subscription;

  constructor(deps: Deps, private readonly statusTimeoutMs: number = STATUS_TIMEOUT_MS) {
    this.pluginData = this.initPluginData(deps.pluginDependencies);
    this.rootPlugins = this.getRootPlugins();
    this.orderedPluginNames = this.getOrderedPluginNames();

    this.coreSubscription = deps.core$
      .pipe(debounceTime(10))
      .subscribe((coreStatus: CoreStatus) => this.updateCoreAndPluginStatuses(coreStatus));
  }

  /**
   * Register a status Observable for a specific plugin
   * @param {PluginName} plugin The name of the plugin
   * @param {Observable<ServiceStatus>} status$ An external Observable that must be trusted as the source of truth for the status of the plugin
   * @throws An error if the status registrations are not allowed
   */
  public set(plugin: PluginName, status$: Observable<ServiceStatus>) {
    if (!this.newRegistrationsAllowed) {
      throw new Error(
        `Custom statuses cannot be registered after setup, plugin [${plugin}] attempted`
      );
    }

    this.isReportingStatus[plugin] = true;
    // unsubscribe from any previous subscriptions. Ideally plugins should register a status Observable only once
    this.reportedStatusSubscriptions[plugin]?.unsubscribe();

    // delete any derived statuses calculated before the custom status Observable was registered
    delete this.pluginStatus[plugin];

    this.reportedStatusSubscriptions[plugin] = status$
      // Set a timeout for externally-defined status Observables
      .pipe(timeoutWith(this.statusTimeoutMs, status$.pipe(startWith(defaultStatus))))
      .subscribe((status) => this.updatePluginReportedStatus(plugin, status));
  }

  /**
   * Prevent plugins from registering status Observables
   */
  public blockNewRegistrations() {
    this.newRegistrationsAllowed = false;
  }

  /**
   * Obtain an Observable of the status of all the plugins
   * @returns {Observable<Record<PluginName, ServiceStatus>>} An Observable that will yield the current status of all plugins
   */
  public getAll$(): Observable<Record<PluginName, ServiceStatus>> {
    return this.pluginStatus$.asObservable().pipe(
      // do not emit until we have a status for all plugins
      filter((all) => Object.keys(all).length === this.orderedPluginNames.length),
      distinctUntilChanged<Record<PluginName, ServiceStatus>>(isDeepStrictEqual)
    );
  }

  /**
   * Obtain an Observable of the status of the dependencies of the given plugin
   * @param {PluginName} plugin the name of the plugin whose dependencies' status must be retreived
   * @returns {Observable<Record<PluginName, ServiceStatus>>} An Observable that will yield the current status of the plugin's dependencies
   */
  public getDependenciesStatus$(plugin: PluginName): Observable<Record<PluginName, ServiceStatus>> {
    const directDependencies = this.pluginData[plugin].dependencies;

    return this.getAll$().pipe(
      map((allStatus) => {
        const dependenciesStatus: Record<PluginName, ServiceStatus> = {};
        directDependencies.forEach((dep) => (dependenciesStatus[dep] = allStatus[dep]));
        return dependenciesStatus;
      }),
      debounceTime(10)
    );
  }

  /**
   * Obtain an Observable of the derived status of the given plugin
   * @param {PluginName} plugin the name of the plugin whose derived status must be retrieved
   * @returns {Observable<ServiceStatus>} An Observable that will yield the derived status of the plugin
   */
  public getDerivedStatus$(plugin: PluginName): Observable<ServiceStatus> {
    return this.pluginData$.asObservable().pipe(
      map((pluginData) => pluginData[plugin]?.derivedStatus),
      filter((status: ServiceStatus | undefined): status is ServiceStatus => !!status),
      distinctUntilChanged<ServiceStatus>(isDeepStrictEqual)
    );
  }

  /**
   * Hook to be called at the stop lifecycle event
   */
  public stop() {
    // Cancel all active subscriptions
    this.coreSubscription.unsubscribe();
    Object.values(this.reportedStatusSubscriptions).forEach((subscription) => {
      subscription.unsubscribe();
    });
  }

  /**
   * Initialize a convenience data structure
   * that maintain up-to-date information about the plugins and their statuses
   * @param {ReadonlyMap<PluginName, PluginName[]>} pluginDependencies Information about the different plugins and their dependencies
   * @returns {PluginData}
   */
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

  /**
   * Create a list with all the root plugins.
   * Root plugins are all those plugins that do not have any dependency.
   * @returns {PluginName[]} a list with all the root plugins present in the provided deps
   */
  private getRootPlugins(): PluginName[] {
    return Object.keys(this.pluginData).filter(
      (plugin) => this.pluginData[plugin].dependencies.length === 0
    );
  }

  /**
   * Obtain a list of plugins names, ordered by depth.
   * @see {calculateDepthRecursive}
   * @returns {PluginName[]} a list of plugins, ordered by depth + name
   */
  private getOrderedPluginNames(): PluginName[] {
    this.rootPlugins.forEach((plugin) => {
      this.calculateDepthRecursive(plugin, 1);
    });

    return sortBy(Object.values(this.pluginData), ['depth', 'name']).map(({ name }) => name);
  }

  /**
   * Calculate the depth of the given plugin, knowing that it's has at least the specified depth
   * The depth of a plugin is determined by how many levels of dependencies the plugin has above it.
   * We define root plugins as depth = 1, plugins that only depend on root plugins will have depth = 2
   * and so on so forth
   * @param {PluginName} plugin the name of the plugin whose depth must be calculated
   * @param {number} depth the minimum depth that we know for sure this plugin has
   */
  private calculateDepthRecursive(plugin: PluginName, depth: number): void {
    const pluginData = this.pluginData[plugin];
    pluginData.depth = Math.max(pluginData.depth, depth);
    const newDepth = depth + 1;
    pluginData.reverseDependencies.forEach((revDep) =>
      this.calculateDepthRecursive(revDep, newDepth)
    );
  }

  /**
   * Updates the core services statuses and plugins' statuses
   * according to the latest status reported by core services.
   * @param {CoreStatus} coreStatus the latest status of core services
   */
  private updateCoreAndPluginStatuses(coreStatus: CoreStatus): void {
    this.coreStatus = coreStatus!;
    const derivedStatus = getSummaryStatus(Object.entries(this.coreStatus), {
      allAvailableSummary: `All dependencies are available`,
    });

    this.rootPlugins.forEach((plugin) => {
      this.pluginData[plugin].derivedStatus = derivedStatus;
      if (!this.isReportingStatus[plugin]) {
        // this root plugin has NOT registered any status Observable. Thus, its status is derived from core
        this.pluginStatus[plugin] = derivedStatus;
      }
    });

    this.updatePluginsStatuses(this.rootPlugins);
  }

  /**
   * Determine the derived statuses of the specified plugins and their dependencies,
   * updating them on the pluginData structure
   * Optionally, if the plugins have not registered a custom status Observable, update their "current" status as well.
   * @param {PluginName[]} plugins The names of the plugins to be updated
   */
  private updatePluginsStatuses(plugins: PluginName[]): void {
    const toCheck = new Set<PluginName>(plugins);

    // Note that we are updating the plugins in an ordered fashion.
    // This way, when updating plugin X (at depth = N),
    // all of its dependencies (at depth < N) have already been updated
    for (let i = 0; i < this.orderedPluginNames.length; ++i) {
      const current = this.orderedPluginNames[i];
      if (toCheck.has(current)) {
        // update the current plugin status
        this.updatePluginStatus(current);
        // flag all its reverse dependencies to be checked
        // TODO flag them only IF the status of this plugin has changed, seems to break some tests
        this.pluginData[current].reverseDependencies.forEach((revDep) => toCheck.add(revDep));
      }
    }

    this.pluginData$.next(this.pluginData);
    this.pluginStatus$.next({ ...this.pluginStatus });
  }

  /**
   * Determine the derived status of the specified plugin and update it on the pluginData structure
   * Optionally, if the plugin has not registered a custom status Observable, update its "current" status as well
   * @param {PluginName} plugin The name of the plugin to be updated
   */
  private updatePluginStatus(plugin: PluginName): void {
    const newStatus = this.determinePluginStatus(plugin);
    this.pluginData[plugin].derivedStatus = newStatus;

    if (!this.isReportingStatus[plugin]) {
      // this plugin has NOT registered any status Observable.
      // Thus, its status is derived from its dependencies + core
      this.pluginStatus[plugin] = newStatus;
    }
  }

  /**
   * Deterime the current plugin status, taking into account its reported status, its derived status
   * and the status of the core services
   * @param {PluginName} plugin the name of the plugin whose status must be determined
   * @returns {ServiceStatus} The status of the plugin
   */
  private determinePluginStatus(plugin: PluginName): ServiceStatus {
    const coreStatus: Array<[PluginName, ServiceStatus]> = Object.entries(this.coreStatus);
    const newLocal = this.pluginData[plugin];

    let depsStatus: Array<[PluginName, ServiceStatus]> = [];

    if (Object.keys(this.isReportingStatus).length) {
      // if at least one plugin has registered a status Observable... take into account plugin dependencies
      depsStatus = newLocal.dependencies.map((dependency) => [
        dependency,
        this.pluginData[dependency].reportedStatus || this.pluginData[dependency].derivedStatus,
      ]);
    }

    const newStatus = getSummaryStatus([...coreStatus, ...depsStatus], {
      allAvailableSummary: `All dependencies are available`,
    });

    return newStatus;
  }

  /**
   * Updates the reported status for the given plugin, along with the status of its dependencies tree.
   * @param {PluginName} plugin The name of the plugin whose reported status must be updated
   * @param {ServiceStatus} reportedStatus The newly reported status for that plugin
   */
  private updatePluginReportedStatus(plugin: PluginName, reportedStatus: ServiceStatus): void {
    const previousReportedStatus = this.pluginData[plugin].reportedStatus;

    this.pluginData[plugin].reportedStatus = reportedStatus;
    this.pluginStatus[plugin] = reportedStatus;

    if (!isEqual(previousReportedStatus, reportedStatus)) {
      this.updatePluginsStatuses([plugin]);
    }
  }
}
