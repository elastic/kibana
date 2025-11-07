/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, type Observable } from 'rxjs';
import type { HttpSetup } from '@kbn/core/public';
import type { Project, ProjectTagsResponse } from '../types';

export interface ProjectsData {
  origin: Project | null;
  linkedProjects: Project[];
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export class CPSManager {
  private readonly http: HttpSetup;
  private readonly projectsSubject: BehaviorSubject<ProjectsData>;
  private fetchPromise: Promise<ProjectsData> | null = null;
  private hasFetchedSuccessfully: boolean = false;

  constructor(http: HttpSetup) {
    this.http = http;
    this.projectsSubject = new BehaviorSubject<ProjectsData>({
      origin: null,
      linkedProjects: [],
    });
  }

  public get projects$(): Observable<ProjectsData> {
    return this.projectsSubject.asObservable();
  }

  public getProjects(): ProjectsData {
    return this.projectsSubject.getValue();
  }

  /**
   * Check if projects have been successfully loaded at least once
   * @returns true if projects have been fetched successfully
   */
  public hasLoadedProjects(): boolean {
    return this.hasFetchedSuccessfully;
  }

  /**
   * Fetches projects from the server with caching and retry logic.
   * Returns cached data if already loaded. If a fetch is already in progress, returns the existing promise.
   * @returns Promise resolving to ProjectsData
   */
  public async fetchProjects(): Promise<ProjectsData> {
    // Skip fetch if already loaded
    if (this.hasFetchedSuccessfully) {
      return this.projectsSubject.getValue();
    }

    return this.doFetch();
  }

  /**
   * Forces a refresh of projects from the server, bypassing the cache.
   * @returns Promise resolving to ProjectsData
   */
  public async refresh(): Promise<ProjectsData> {
    return this.doFetch();
  }

  private async doFetch(): Promise<ProjectsData> {
    // If a fetch is already in progress, return the existing promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = this.fetchProjectsWithRetry()
      .then((projectsData) => {
        this.projectsSubject.next(projectsData);
        this.hasFetchedSuccessfully = true;
        return projectsData;
      })
      .catch((error) => {
        // Still emit a value to the projects subject so components can handle the empty state
        const emptyData: ProjectsData = { origin: null, linkedProjects: [] };
        this.projectsSubject.next(emptyData);
        throw error;
      })
      .finally(() => {
        this.fetchPromise = null;
      });

    return this.fetchPromise;
  }

  private async fetchProjectsWithRetry(): Promise<ProjectsData> {
    let lastError: Error;

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
        // eslint-disable-next-line no-console
        console.error(`Failed to fetch projects (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);

        // Don't wait after the last attempt
        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError!;
  }
}
