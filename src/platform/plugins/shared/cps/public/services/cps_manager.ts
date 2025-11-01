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

export class CPSManager {
  private readonly http: HttpSetup;
  private readonly projectsSubject: BehaviorSubject<ProjectsData>;

  constructor(http: HttpSetup) {
    this.http = http;
    this.projectsSubject = new BehaviorSubject<ProjectsData>({
      origin: null,
      linkedProjects: [],
    });

    this.fetchProjects();
  }

  public get projects$(): Observable<ProjectsData> {
    return this.projectsSubject.asObservable();
  }

  public getProjects(): ProjectsData {
    return this.projectsSubject.getValue();
  }

  public async refresh(): Promise<void> {
    await this.fetchProjects();
  }

  private async fetchProjects(): Promise<void> {
    try {
      const response = await this.http.get<ProjectTagsResponse>('/internal/cps/projects_tags');
      const origin = response.origin ? Object.values(response.origin)[0] : null;
      const linkedProjects = response.linked_projects
        ? Object.values(response.linked_projects).sort((a, b) => a._alias.localeCompare(b._alias))
        : [];

      this.projectsSubject.next({
        origin,
        linkedProjects,
      });
    } catch (error) {
      // Silently handle errors - keep the current state
      // eslint-disable-next-line no-console
      console.error('Failed to fetch projects:', error);
    }
  }
}
