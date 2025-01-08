/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { ServiceStatus, CoreStatus } from '@kbn/core-status-common';

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
   * The first emission from this Observable should occur within 30s, else this plugin's status will fallback to
   * `unavailable` until the first emission.
   *
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
   * This may emit multiple times for a single status change event as propagates
   * through the dependency tree
   */
  derivedStatus$: Observable<ServiceStatus>;

  /**
   * Whether or not the status HTTP APIs are available to unauthenticated users when an authentication provider is
   * present.
   */
  isStatusPageAnonymous: () => boolean;
}
