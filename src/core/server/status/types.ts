/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { deepFreeze } from '@kbn/std';
import { PluginName } from '../plugins';

/**
 * The current status of a service at a point in time.
 *
 * @typeParam Meta - JSON-serializable object. Plugins should export this type to allow other plugins to read the `meta`
 *                   field in a type-safe way.
 * @public
 */
export interface ServiceStatus<Meta extends Record<string, any> | unknown = unknown> {
  /**
   * The current availability level of the service.
   */
  level: ServiceStatusLevel;
  /**
   * A high-level summary of the service status.
   */
  summary: string;
  /**
   * A more detailed description of the service status.
   */
  detail?: string;
  /**
   * A URL to open in a new tab about how to resolve or troubleshoot the problem.
   */
  documentationUrl?: string;
  /**
   * Any JSON-serializable data to be included in the HTTP API response. Useful for providing more fine-grained,
   * machine-readable information about the service status. May include status information for underlying features.
   */
  meta?: Meta;
}

/**
 * The current "level" of availability of a service.
 *
 * @remarks
 * The values implement `valueOf` to allow for easy comparisons between status levels with <, >, etc. Higher values
 * represent higher severities. Note that the default `Array.prototype.sort` implementation does not correctly sort
 * these values.
 *
 * A snapshot serializer is available in `src/core/server/test_utils` to ease testing of these values with Jest.
 *
 * @public
 */
export const ServiceStatusLevels = deepFreeze({
  /**
   * Everything is working!
   */
  available: {
    toString: () => 'available',
    valueOf: () => 0,
    toJSON() {
      return this.toString();
    },
  },
  /**
   * Some features may not be working.
   */
  degraded: {
    toString: () => 'degraded',
    valueOf: () => 1,
    toJSON() {
      return this.toString();
    },
  },
  /**
   * The service is unavailable, but other functions that do not depend on this service should work.
   */
  unavailable: {
    toString: () => 'unavailable',
    valueOf: () => 2,
    toJSON() {
      return this.toString();
    },
  },
  /**
   * Block all user functions and display the status page, reserved for Core services only.
   */
  critical: {
    toString: () => 'critical',
    valueOf: () => 3,
    toJSON() {
      return this.toString();
    },
  },
});

/**
 * A convenience type that represents the union of each value in {@link ServiceStatusLevels}.
 * @public
 */
export type ServiceStatusLevel = typeof ServiceStatusLevels[keyof typeof ServiceStatusLevels];

/**
 * Status of core services.
 *
 * @internalRemarks
 * Only contains entries for backend services that could have a non-available `status`.
 * For example, `context` cannot possibly be broken, so it is not included.
 *
 * @public
 */
export interface CoreStatus {
  elasticsearch: ServiceStatus;
  savedObjects: ServiceStatus;
}

/**
 * API for accessing status of Core and this plugin's dependencies as well as for customizing this plugin's status.
 *
 * @remarks
 * By default, a plugin inherits it's current status from the most severe status level of any Core services and any
 * plugins that it depends on. This default status is available on the
 * {@link ServiceStatusSetup.derivedStatus$ | core.status.derviedStatus$} API.
 *
 * Plugins may customize their status calculation by calling the {@link ServiceStatusSetup.set | core.status.set} API
 * with an Observable. Within this Observable, a plugin may choose to only depend on the status of some of its
 * dependencies, to ignore severe status levels of particular Core services they are not concerned with, or to make its
 * status dependent on other external services.
 *
 * @example
 * Customize a plugin's status to only depend on the status of SavedObjects:
 * ```ts
 * core.status.set(
 *   core.status.core$.pipe(
 * .   map((coreStatus) => {
 *       return coreStatus.savedObjects;
 *     }) ;
 *   );
 * );
 * ```
 *
 * @example
 * Customize a plugin's status to include an external service:
 * ```ts
 * const externalStatus$ = interval(1000).pipe(
 *   switchMap(async () => {
 *     const resp = await fetch(`https://myexternaldep.com/_healthz`);
 *     const body = await resp.json();
 *     if (body.ok) {
 *       return of({ level: ServiceStatusLevels.available, summary: 'External Service is up'});
 *     } else {
 *       return of({ level: ServiceStatusLevels.available, summary: 'External Service is unavailable'});
 *     }
 *   }),
 *   catchError((error) => {
 *     of({ level: ServiceStatusLevels.unavailable, summary: `External Service is down`, meta: { error }})
 *   })
 * );
 *
 * core.status.set(
 *   combineLatest([core.status.derivedStatus$, externalStatus$]).pipe(
 *     map(([derivedStatus, externalStatus]) => {
 *       if (externalStatus.level > derivedStatus) {
 *         return externalStatus;
 *       } else {
 *         return derivedStatus;
 *       }
 *     })
 *   )
 * );
 * ```
 *
 * @public
 */
export interface StatusServiceSetup {
  /**
   * Current status for all Core services.
   */
  core$: Observable<CoreStatus>;

  /**
   * Overall system status for all of Kibana.
   *
   * @remarks
   * The level of the overall status will reflect the most severe status of any core service or plugin.
   *
   * Exposed only for reporting purposes to outside systems and should not be used by plugins. Instead, plugins should
   * only depend on the statuses of {@link StatusServiceSetup.core$ | Core} or their dependencies.
   */
  overall$: Observable<ServiceStatus>;

  /**
   * Allows a plugin to specify a custom status dependent on its own criteria.
   * Completely overrides the default inherited status.
   *
   * @remarks
   * See the {@link StatusServiceSetup.derivedStatus$} API for leveraging the default status
   * calculation that is provided by Core.
   */
  set(status$: Observable<ServiceStatus>): void;

  /**
   * Current status for all plugins this plugin depends on.
   * Each key of the `Record` is a plugin id.
   */
  dependencies$: Observable<Record<string, ServiceStatus>>;

  /**
   * The status of this plugin as derived from its dependencies.
   *
   * @remarks
   * By default, plugins inherit this derived status from their dependencies.
   * Calling {@link StatusSetup.set} overrides this default status.
   *
   * This may emit multliple times for a single status change event as propagates
   * through the dependency tree
   */
  derivedStatus$: Observable<ServiceStatus>;

  /**
   * Whether or not the status HTTP APIs are available to unauthenticated users when an authentication provider is
   * present.
   */
  isStatusPageAnonymous: () => boolean;
}

/** @internal */
export interface InternalStatusServiceSetup
  extends Pick<StatusServiceSetup, 'core$' | 'overall$' | 'isStatusPageAnonymous'> {
  // Namespaced under `plugins` key to improve clarity that these are APIs for plugins specifically.
  plugins: {
    set(plugin: PluginName, status$: Observable<ServiceStatus>): void;
    getDependenciesStatus$(plugin: PluginName): Observable<Record<string, ServiceStatus>>;
    getDerivedStatus$(plugin: PluginName): Observable<ServiceStatus>;
  };
}
