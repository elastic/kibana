/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  BehaviorSubject,
  merge,
  Observable,
  ReplaySubject,
  Subject,
  type Subscription,
} from 'rxjs';
import { map, distinctUntilChanged, filter, tap, debounceTime, takeUntil, delay } from 'rxjs';
import { isDeepStrictEqual } from 'util';
import type { PluginName } from '@kbn/core-base-common';
import { ServiceStatusLevels, type CoreStatus, type ServiceStatus } from '@kbn/core-status-common';
import { getSummaryStatus } from './get_summary_status';
import type { PluginStatus } from './types';

const STATUS_TIMEOUT_MS = 30 * 1000; // 30 seconds

const defaultStatus: ServiceStatus = {
  level: ServiceStatusLevels.unavailable,
  summary: 'Status not yet available',
};

export interface Deps {
  core$: Observable<CoreStatus>;
  pluginDependencies: ReadonlyMap<PluginName, PluginName[]>;
}

interface PluginData {
  [name: PluginName]: {
    name: PluginName;
    dependencies: PluginName[];
    reverseDependencies: PluginName[];
    reportedStatus?: PluginStatus;
    derivedStatus: PluginStatus;
  };
}

interface PluginsStatus {
  [name: PluginName]: PluginStatus;
}

interface ReportedStatusSubscriptions {
  [name: PluginName]: Subscription;
}

export class PluginsStatusService {
  private coreStatus: CoreStatus = {
    elasticsearch: { ...defaultStatus },
    savedObjects: { ...defaultStatus },
  };
  private pluginData: PluginData;
  private rootPlugins: PluginName[]; // root plugins are those that do not have any dependencies
  private orderedPluginNames: PluginName[];
  private start$ = new Subject<void>();
  private pluginData$ = new ReplaySubject<PluginData>(1);
  private pluginStatus: PluginsStatus = {};
  private pluginStatus$ = new BehaviorSubject<PluginsStatus>(this.pluginStatus);
  private reportedStatusSubscriptions: ReportedStatusSubscriptions = {};
  private reportingStatus: Record<PluginName, boolean> = {};
  private newRegistrationsAllowed = true;
  private coreSubscription: Subscription;

  constructor(deps: Deps, private readonly statusTimeoutMs: number = STATUS_TIMEOUT_MS) {
    this.pluginData = this.initPluginData(deps.pluginDependencies);
    this.rootPlugins = this.getRootPlugins();
    // plugin dependencies keys are already sorted
    this.orderedPluginNames = [...deps.pluginDependencies.keys()];

    this.coreSubscription = deps.core$
      .pipe(
        debounceTime(10),
        tap((coreStatus) => (this.coreStatus = coreStatus)),
        map((serviceStatuses) => getSummaryStatus({ serviceStatuses })),
        // no need to recalculate plugins statuses if core status hasn't changed
        distinctUntilChanged((previous, current) => previous.level === current.level)
      )
      .subscribe((derivedCoreStatus: ServiceStatus) => {
        this.updateRootPluginsStatuses(derivedCoreStatus);
        this.updateDependantStatuses(this.rootPlugins);
        this.emitCurrentStatus();
      });
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

    this.reportingStatus[plugin] = true;
    // unsubscribe from any previous subscriptions. Ideally plugins should register a status Observable only once
    this.reportedStatusSubscriptions[plugin]?.unsubscribe();

    // delete any derived statuses calculated before the custom status Observable was registered
    delete this.pluginStatus[plugin];

    const firstEmissionTimeout$ = this.start$.pipe(
      delay(this.statusTimeoutMs),
      map(() => ({
        level: ServiceStatusLevels.unavailable,
        summary: `Status check timed out after ${
          this.statusTimeoutMs < 1000
            ? `${this.statusTimeoutMs}ms`
            : `${this.statusTimeoutMs / 1000}s`
        }`,
      })),
      takeUntil(status$)
    );

    this.reportedStatusSubscriptions[plugin] = merge(firstEmissionTimeout$, status$)
      .pipe(distinctUntilChanged())
      .subscribe((status) => {
        const { levelChanged, summaryChanged } = this.updatePluginReportedStatus(plugin, status);

        if (levelChanged) {
          this.updateDependantStatuses([plugin]);
        }

        if (levelChanged || summaryChanged) {
          this.emitCurrentStatus();
        }
      });
  }

  public start() {
    // Prevent plugins from registering status Observables
    this.newRegistrationsAllowed = false;
    this.start$.next();
    this.start$.complete();
  }

  /**
   * Obtain an Observable of the status of all the plugins
   * @returns {Observable<Record<PluginName, PluginStatus>>} An Observable that will yield the current status of all plugins
   */
  public getAll$(): Observable<Record<PluginName, PluginStatus>> {
    return this.pluginStatus$.asObservable().pipe(
      // do not emit until we have a status for all plugins
      filter((all) => Object.keys(all).length === this.orderedPluginNames.length),
      distinctUntilChanged<Record<PluginName, PluginStatus>>(isDeepStrictEqual)
    );
  }

  /**
   * Obtain an Observable of the status of the dependencies of the given plugin
   * @param {PluginName} plugin the name of the plugin whose dependencies' status must be retreived
   * @returns {Observable<Record<PluginName, PluginStatus>>} An Observable that will yield the current status of the plugin's dependencies
   */
  public getDependenciesStatus$(plugin: PluginName): Observable<Record<PluginName, PluginStatus>> {
    const directDependencies = this.pluginData[plugin].dependencies;

    return this.getAll$().pipe(
      map((allStatus) => {
        const dependenciesStatus: Record<PluginName, PluginStatus> = {};
        directDependencies.forEach((dep) => (dependenciesStatus[dep] = allStatus[dep]));
        return dependenciesStatus;
      }),
      debounceTime(10)
    );
  }

  /**
   * Obtain an Observable of the derived status of the given plugin
   * @param {PluginName} plugin the name of the plugin whose derived status must be retrieved
   * @returns {Observable<PluginStatus>} An Observable that will yield the derived status of the plugin
   */
  public getDerivedStatus$(plugin: PluginName): Observable<PluginStatus> {
    return this.pluginData$.asObservable().pipe(
      map((pluginData) => pluginData[plugin]?.derivedStatus),
      filter((status: PluginStatus | undefined): status is PluginStatus => !!status),
      distinctUntilChanged<PluginStatus>(isDeepStrictEqual)
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

    pluginDependencies.forEach((dependencies, name) => {
      pluginData[name] = {
        name,
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
   * Updates the root plugins statuses according to the current core services status
   */
  private updateRootPluginsStatuses(derivedCoreStatus: ServiceStatus): void {
    // note that the derived status is the same for all root plugins
    this.rootPlugins.forEach((pluginName) => {
      this.pluginData[pluginName].derivedStatus = derivedCoreStatus;
      if (!this.reportingStatus[pluginName]) {
        // this root plugin has NOT registered any status Observable. Thus, its status is derived from core
        this.pluginStatus[pluginName] = derivedCoreStatus;
      }
    });
  }

  /**
   * Update the derived statuses of the specified plugins' dependant plugins,
   * If impacted plugins have not registered a custom status Observable, update their "current" status as well.
   * @param {PluginName[]} plugins The names of the plugins whose dependant plugins must be updated
   */
  private updateDependantStatuses(plugins: PluginName[]): void {
    const toCheck = new Set<PluginName>();
    plugins.forEach((plugin) =>
      this.pluginData[plugin].reverseDependencies.forEach((revDep) => toCheck.add(revDep))
    );

    // Note that we are updating the plugins in an ordered fashion.
    // This way, when updating plugin X (at depth = N),
    // all of its dependencies (at depth < N) have already been updated
    for (let i = 0; i < this.orderedPluginNames.length; ++i) {
      const current = this.orderedPluginNames[i];
      if (toCheck.has(current)) {
        // update the current plugin status
        this.updatePluginsStatus(current);
        // flag all its reverse dependencies to be checked
        // TODO flag them only IF the status of this plugin has changed, seems to break some tests
        this.pluginData[current].reverseDependencies.forEach((revDep) => toCheck.add(revDep));
      }
    }
  }

  /**
   * Determine the derived status of the specified plugin and update it on the pluginData structure
   * Optionally, if the plugin has not registered a custom status Observable, update its "current" status as well
   * @param {PluginName} plugin The name of the plugin to be updated
   */
  private updatePluginsStatus(plugin: PluginName): void {
    const newStatus = this.determineDerivedStatus(plugin);
    this.pluginData[plugin].derivedStatus = newStatus;

    if (!this.reportingStatus[plugin]) {
      // this plugin has NOT registered any status Observable.
      // Thus, its status is derived from its dependencies + core
      this.pluginStatus[plugin] = newStatus;
    }
  }

  /**
   * Determine the plugin's derived status (taking into account dependencies and core services)
   * @param {PluginName} pluginName the name of the plugin whose status must be determined
   * @returns {PluginStatus} The status of the plugin
   */
  private determineDerivedStatus(pluginName: PluginName): PluginStatus {
    if (Object.keys(this.reportingStatus).length) {
      // if at least one plugin has registered a status Observable... take into account plugin dependencies
      const pluginData = this.pluginData[pluginName];

      const dependenciesStatuses = Object.fromEntries(
        pluginData.dependencies.map((dependency) => [
          dependency,
          this.pluginData[dependency].reportedStatus ?? this.pluginData[dependency].derivedStatus,
        ])
      );
      return getSummaryStatus({
        serviceStatuses: this.coreStatus,
        pluginStatuses: dependenciesStatuses,
      });
    } else {
      // no plugins have registered a status Observable... infer status from Core services only
      return getSummaryStatus({
        serviceStatuses: this.coreStatus,
      });
    }
  }

  /**
   * Updates the reported status for the given plugin.
   * @param {PluginName} pluginName The name of the plugin whose reported status must be updated
   * @param {ServiceStatus} status The newly reported status for that plugin
   * @return {Object} indicating whether the level and/or the summary have changed
   */
  private updatePluginReportedStatus(pluginName: PluginName, status: ServiceStatus) {
    const previousReportedStatus = this.pluginData[pluginName].reportedStatus;

    const reportedStatus: PluginStatus = {
      ...status,
      reported: true,
    };
    this.pluginData[pluginName].reportedStatus = reportedStatus;
    this.pluginStatus[pluginName] = reportedStatus;

    return {
      levelChanged: previousReportedStatus?.level !== reportedStatus.level,
      summaryChanged: previousReportedStatus?.summary !== reportedStatus.summary,
    };
  }

  /**
   * Emit the current status to internal Subjects, effectively propagating it to observers.
   */
  private emitCurrentStatus(): void {
    this.pluginData$.next(this.pluginData);
    // we must clone the plugin status to prevent future modifications from updating current emission
    this.pluginStatus$.next({ ...this.pluginStatus });
  }
}
