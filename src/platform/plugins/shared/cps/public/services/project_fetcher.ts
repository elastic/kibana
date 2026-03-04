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
import type { ProjectTagsResponse, ProjectsData } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export interface ProjectFetcher {
  fetchProjects: (projectRouting?: ProjectRouting) => Promise<ProjectsData | null>;
}

/**
 * Creates project fetcher with retry logic.
 */
export function createProjectFetcher(http: HttpSetup, logger: Logger): ProjectFetcher {
  async function fetchProjectsWithRetry(
    projectRouting?: ProjectRouting
  ): Promise<ProjectsData | null> {
    let lastError: Error = new Error('');

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await http.post<ProjectTagsResponse>('/internal/cps/projects_tags', {
          body: JSON.stringify(projectRouting ? { project_routing: projectRouting } : {}),
        });
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
        logger.error(`Failed to fetch projects (attempt ${attempt + 1}/${MAX_RETRIES + 1})`, {
          error,
        });

        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  }

  return {
    /**
     * Fetches projects from the server with retry logic.
     */
    fetchProjects: async (projectRouting?: ProjectRouting): Promise<ProjectsData | null> => {
      return await fetchProjectsWithRetry(projectRouting);
    },
  };
}
