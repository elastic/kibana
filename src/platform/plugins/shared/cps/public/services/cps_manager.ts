/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart, HttpSetup } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { ProjectRouting } from '@kbn/es-query';
import { BehaviorSubject, combineLatest, switchMap } from 'rxjs';
import {
  type ICPSManager,
  type ProjectsData,
  PROJECT_ROUTING,
  ProjectRoutingAccess,
} from '@kbn/cps-utils';
import type { ProjectFetcher } from './project_fetcher';

/**
 * This should be configured on spaces level.
 * Common values: PROJECT_ROUTING.ALL (all projects, will be parsed to undefined on request level), '_alias:_origin' (origin project only)
 */
export const DEFAULT_PROJECT_ROUTING: ProjectRouting = PROJECT_ROUTING.ALL;

/**
 * Central service for managing project routing and project data.
 *
 * - Fetches project data from ES via `/internal/cps/projects_tags` endpoint (with caching and retry logic)
 * - Manages current project routing state using observables
 * - projectRouting$ represents temporary UI state; apps should reset to their saved value or DEFAULT_PROJECT_ROUTING on navigation
 */
export class CPSManager implements ICPSManager {
  private readonly http: HttpSetup;
  private readonly logger: Logger;
  private readonly application: ApplicationStart;
  private projectFetcherPromise: Promise<ProjectFetcher> | null = null;
  private readonly projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(
    DEFAULT_PROJECT_ROUTING
  );
  private readonly projectPickerAccess$ = new BehaviorSubject<ProjectRoutingAccess>(
    ProjectRoutingAccess.EDITABLE
  );

  constructor(deps: { http: HttpSetup; logger: Logger; application: ApplicationStart }) {
    this.http = deps.http;
    this.logger = deps.logger.get('cps_manager');
    this.application = deps.application;

    combineLatest([this.application.currentAppId$, this.application.currentLocation$])
      .pipe(
        switchMap(async ([appId, location]) => {
          return (await import('./async_services')).getProjectRoutingAccess(
            appId ?? '',
            location ?? ''
          );
        })
      )
      .subscribe((access) => {
        this.projectPickerAccess$.next(access);
        // Reset project routing to default when access is disabled
        if (access === ProjectRoutingAccess.DISABLED) {
          this.projectRouting$.next(DEFAULT_PROJECT_ROUTING);
        }
      });
  }

  /**
   * Get the current project routing as an observable
   */
  public getProjectRouting$() {
    return this.projectRouting$.asObservable();
  }

  /**
   * Set the current project routing
   */
  public setProjectRouting(projectRouting: ProjectRouting) {
    this.projectRouting$.next(projectRouting);
  }

  /**
   * Get the current project routing value
   */
  public getProjectRouting() {
    if (this.projectPickerAccess$.value === ProjectRoutingAccess.DISABLED) {
      return undefined;
    }
    return this.projectRouting$.value;
  }

  /**
   * Get the default project routing value from a global space setting.
   * This is the fallback value used when no app-specific or saved value exists.
   */
  public getDefaultProjectRouting(): ProjectRouting {
    return DEFAULT_PROJECT_ROUTING;
  }

  /**
   * Get the project picker access level as an observable.
   * This combines the current app ID and location to determine whether
   * the project picker should be editable, readonly, or disabled.
   */
  public getProjectPickerAccess$() {
    return this.projectPickerAccess$;
  }

  /**
   * Get the current project picker access value
   */
  public getProjectPickerAccess() {
    return this.projectPickerAccess$.value;
  }

  /**
   * Fetches projects from the server with caching and retry logic.
   * Returns cached data if already loaded. If a fetch is already in progress, returns the existing promise.
   * @returns Promise resolving to ProjectsData
   */
  public async fetchProjects(): Promise<ProjectsData | null> {
    const fetcher = await this.getProjectFetcher();
    return fetcher.fetchProjects();
  }

  /**
   * Forces a refresh of projects from the server, bypassing the cache.
   * @returns Promise resolving to ProjectsData
   */
  public async refresh(): Promise<ProjectsData | null> {
    const fetcher = await this.getProjectFetcher();
    return fetcher.refresh();
  }

  private async getProjectFetcher() {
    if (!this.projectFetcherPromise) {
      this.projectFetcherPromise = import('./async_services').then(({ createProjectFetcher }) =>
        createProjectFetcher(this.http, this.logger)
      );
    }
    return this.projectFetcherPromise;
  }
}
