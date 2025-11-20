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
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import {
  type ProjectTagsResponse,
  type ICPSManager,
  type ProjectsData,
  PROJECT_ROUTING,
} from '@kbn/cps-utils';
import { getProjectRoutingAccess, getReadonlyMessage } from './access_control';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

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
  private fetchPromise: Promise<ProjectsData | null> | null = null;
  private cachedData: ProjectsData | null = null;
  // Initialize without a value - apps will set their value during initialization
  private readonly projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(
    DEFAULT_PROJECT_ROUTING
  );
  private readonly projectPickerAccess$;

  constructor(deps: { http: HttpSetup; logger: Logger; application: ApplicationStart }) {
    this.http = deps.http;
    this.logger = deps.logger.get('cps_manager');
    this.application = deps.application;

    this.projectPickerAccess$ = combineLatest([
      this.application.currentAppId$,
      this.application.currentLocation$,
    ]).pipe(
      map(([appId, location]) => {
        const access = getProjectRoutingAccess(appId ?? '', location ?? '');
        return { access, readonlyMessage: getReadonlyMessage(appId) };
      })
    );
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
  public setProjectRouting(projectRouting: ProjectRouting | undefined) {
    this.projectRouting$.next(projectRouting);
  }

  /**
   * Get the current project routing value
   */
  public getProjectRouting() {
    return this.projectRouting$.value;
  }

  /**
   * Get the default project routing value.
   * This is the fallback value used when no app-specific or saved value exists.
   */
  public getDefaultProjectRouting(): ProjectRouting {
    return DEFAULT_PROJECT_ROUTING;
  }

  /**
   * Get the project picker access level as an observable.
   * This combines the current app ID and location to determine whether
   * the project picker should be editable, readonly, or disabled.
   * Also returns the custom readonly message if applicable.
   */
  public getProjectPickerAccess$() {
    return this.projectPickerAccess$;
  }

  /**
   * Fetches projects from the server with caching and retry logic.
   * Returns cached data if already loaded. If a fetch is already in progress, returns the existing promise.
   * @returns Promise resolving to ProjectsData
   */
  public async fetchProjects(): Promise<ProjectsData | null> {
    // Return cached data if available
    if (this.cachedData) {
      return this.cachedData;
    }

    return this.doFetch();
  }

  /**
   * Forces a refresh of projects from the server, bypassing the cache.
   * @returns Promise resolving to ProjectsData
   */
  public async refresh(): Promise<ProjectsData | null> {
    return this.doFetch();
  }

  private async doFetch(): Promise<ProjectsData | null> {
    // If a fetch is already in progress, return the existing promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = this.fetchProjectsWithRetry()
      .then((projectsData) => {
        this.cachedData = projectsData;
        return projectsData;
      })
      .finally(() => {
        this.fetchPromise = null;
      });

    return this.fetchPromise;
  }

  private async fetchProjectsWithRetry(): Promise<ProjectsData | null> {
    let lastError: Error = new Error('');

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.http.get<ProjectTagsResponse>('/internal/cps/projects_tags');
        const originValues = response.origin ? Object.values(response.origin) : [];

        return {
          origin: originValues.length > 0 ? originValues[0] : null,
          linkedProjects: response.linked_projects
            ? Object.values(response.linked_projects).sort((a, b) =>
                a._alias.localeCompare(b._alias)
              )
            : [],
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`Failed to fetch projects (attempt ${attempt + 1}/${MAX_RETRIES + 1})`, {
          error,
        });

        // Don't wait after the last attempt
        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  }
}
