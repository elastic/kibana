/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectRouting } from '@kbn/es-query';
import type { CPSProject, ProjectsData } from '../types';
export interface UseFetchProjectsResult {
  originProject: CPSProject | null;
  linkedProjects: CPSProject[];
  isLoading: boolean;
  error: Error | null;
}
/**
 * Hook for fetching projects data from CPSManager.
 * Uses a single state object to batch all updates into one re-render per fetch cycle.
 */
export declare const useFetchProjects: (
  fetchProjects: (routing?: ProjectRouting) => Promise<ProjectsData | null>,
  routing?: ProjectRouting
) => UseFetchProjectsResult;
