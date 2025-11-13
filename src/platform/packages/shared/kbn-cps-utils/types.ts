/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectRouting } from '@kbn/es-query';
import type { Observable } from 'rxjs';

export interface CPSProject {
  _id: string;
  _alias: string;
  _type: string;
  _organisation: string;
  [key: string]: string;
}

export interface ProjectTagsResponse {
  origin: Record<string, CPSProject>;
  linked_projects: Record<string, CPSProject>;
}

export interface ProjectsData {
  origin: CPSProject | null;
  linkedProjects: CPSProject[];
}

export interface ICPSManager {
  fetchProjects(): Promise<ProjectsData | null>;
  refresh(): Promise<ProjectsData | null>;
  getProjectRouting$(): Observable<ProjectRouting>;
  setProjectRouting(projectRouting: ProjectRouting): void;
  getProjectRouting(): ProjectRouting;
}
