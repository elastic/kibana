/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { ProjectRouting } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import type { ProjectTagsResponse, ICPSManager, ProjectsData } from '@kbn/cps-utils';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export class CPSManager implements ICPSManager {
  private readonly http: HttpSetup;
  private readonly logger: Logger;
  private fetchPromise: Promise<ProjectsData | null> | null = null;
  private cachedData: ProjectsData | null = null;
  private readonly projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(undefined);

  constructor(deps: { http: HttpSetup; logger: Logger }) {
    this.http = deps.http;
    this.logger = deps.logger.get('cps_manager');
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
