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
  ProjectRoutingAccess,
  PROJECT_ROUTING,
} from '@kbn/cps-utils';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import { getSpaceDefaultNpreName } from '@kbn/cps-common';
import type { ProjectFetcher } from './project_fetcher';

/**
 * Central service for managing project routing and project data.
 *
 * - Fetches project data from ES via `/internal/cps/projects_tags` endpoint (with caching and retry logic)
 * - Manages current project routing state using observables
 * - projectRouting$ represents temporary UI state; apps should reset to their saved value or spaces project routing on navigation
 */
export class CPSManager implements ICPSManager {
  private readonly http: HttpSetup;
  private readonly logger: Logger;
  private readonly application: ApplicationStart;
  private projectFetcherPromise: Promise<ProjectFetcher> | null = null;
  private defaultProjectRouting: string = PROJECT_ROUTING.ALL;
  private totalProjectCount: number = 0;
  private readonly readyPromise: Promise<void>;
  private readonly projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(
    this.defaultProjectRouting
  );
  private readonly projectPickerAccess$ = new BehaviorSubject<ProjectRoutingAccess>(
    ProjectRoutingAccess.EDITABLE
  );
  private lastEditableProjectRouting: ProjectRouting | undefined = undefined;

  constructor(deps: { http: HttpSetup; logger: Logger; application: ApplicationStart }) {
    this.http = deps.http;
    this.logger = deps.logger.get('cps_manager');
    this.application = deps.application;

    this.readyPromise = Promise.all([
      this.initializeDefaultProjectRouting(),
      this.fetchTotalProjectCount(),
    ]).then(() => {});

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
        // Reset project routing to default when access is disabled or readonly, to prevent showing stale or unauthorized project context
        if (access === ProjectRoutingAccess.READONLY) {
          this.projectRouting$.next(this.defaultProjectRouting);
        } else if (access === ProjectRoutingAccess.DISABLED) {
          this.projectRouting$.next(undefined);
        } else if (access === ProjectRoutingAccess.EDITABLE) {
          this.projectRouting$.next(this.lastEditableProjectRouting ?? this.defaultProjectRouting);
        }
      });
  }

  /**
   * Resolves once the default project routing and total count of projects has been fetched
   */
  public whenReady(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Initialize the default project routing from the active space.
   * Fetches the default project routing for the current space from the CPS plugin.
   */
  private async initializeDefaultProjectRouting() {
    try {
      const basePath = this.http.basePath.get();
      const { spaceId } = getSpaceIdFromPath(basePath, this.http.basePath.serverBasePath);

      const projectRoutingName = getSpaceDefaultNpreName(spaceId);

      // init the current project routing to the space name

      const projectRouting = await this.fetchNpreOrDefault(projectRoutingName);
      this.projectRouting$.next(projectRouting);
      this.updateDefaultProjectRouting(projectRouting);
    } catch (error) {
      this.logger.warn('Failed to fetch default project routing for space', error);
    }
  }

  /**
   * Get the default project routing value from a global space setting.
   * This is the fallback value used when no app-specific or saved value exists.
   */
  public getDefaultProjectRouting(): ProjectRouting {
    return this.defaultProjectRouting;
  }

  /**
   * Fetch a named project routing expression value from the CPS plugin.
   *
   * Returns {@link PROJECT_ROUTING.ALL} when the expression doesn't exist (404).
   */
  private async fetchNpreOrDefault(projectRoutingName: string): Promise<string> {
    try {
      return await this.http.get<string>(`/internal/cps/project_routing/${projectRoutingName}`);
    } catch (error) {
      if (error?.response?.status === 404) {
        return PROJECT_ROUTING.ALL;
      }

      throw error;
    }
  }

  public updateDefaultProjectRouting(projectRouting: string) {
    this.defaultProjectRouting = projectRouting;

    this.lastEditableProjectRouting = this.defaultProjectRouting;

    // If access is disabled, `projectRouting$` must remain undefined.
    if (this.projectPickerAccess$.value === ProjectRoutingAccess.DISABLED) {
      return;
    }

    this.projectRouting$.next(this.defaultProjectRouting);
  }

  /**
   * Fetches total project count
   */
  private async fetchTotalProjectCount(): Promise<void> {
    try {
      const projectsData = await this.fetchProjects(PROJECT_ROUTING.ALL);
      this.totalProjectCount =
        (projectsData?.origin ? 1 : 0) + (projectsData?.linkedProjects.length ?? 0);
    } catch (error) {
      this.logger.warn('Failed to fetch total project count', error);
    }
  }

  /**
   * Returns the total number of projects (origin + linked) across all project routings.
   */
  public getTotalProjectCount(): number {
    return this.totalProjectCount;
  }

  /**
   * Get the current project routing as an observable
   */
  public getProjectRouting$() {
    return this.projectRouting$.asObservable();
  }

  /**
   * Get the current project routing value
   */
  public getProjectRouting(overrideValue?: ProjectRouting) {
    if (this.projectPickerAccess$.value === ProjectRoutingAccess.DISABLED) {
      return undefined;
    } else if (this.projectPickerAccess$.value === ProjectRoutingAccess.READONLY) {
      return this.defaultProjectRouting;
    }
    return overrideValue ?? this.projectRouting$.value;
  }

  /**
   * Set the current project routing
   */
  public setProjectRouting(projectRouting: ProjectRouting) {
    if (this.projectPickerAccess$.value === ProjectRoutingAccess.EDITABLE) {
      this.lastEditableProjectRouting = projectRouting;
    }
    this.projectRouting$.next(projectRouting);
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
  public async fetchProjects(projectRouting?: ProjectRouting): Promise<ProjectsData | null> {
    return (await this.getProjectFetcher()).fetchProjects(
      projectRouting ?? this.getProjectRouting()
    );
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
