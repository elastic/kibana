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
export const CACHE_TTL_MS = 15_000; // cache keeps data for 15 seconds

interface CacheEntry {
  data: ProjectsData | null;
  fetchedAt: number;
}

export interface ProjectFetcher {
  fetchProjects: (projectRouting?: ProjectRouting) => Promise<ProjectsData | null>;
}

/**
 * Creates project fetcher with retry logic, in-flight deduplication, and short-lived caching.
 *
 * - Concurrent calls with the same `projectRouting` share a single HTTP round-trip.
 * - Successful responses are cached for {@link CACHE_TTL_MS}; subsequent calls within that
 *   window return the cached result without a network request.
 * - Errors are never cached — the next call always retries.
 */
export function createProjectFetcher(http: HttpSetup, logger: Logger): ProjectFetcher {
  const inFlightRequests = new Map<ProjectRouting | undefined, Promise<ProjectsData | null>>();
  const cache = new Map<ProjectRouting | undefined, CacheEntry>();

  async function fetchWithRetry(projectRouting?: ProjectRouting): Promise<ProjectsData | null> {
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
    fetchProjects: (projectRouting?: ProjectRouting): Promise<ProjectsData | null> => {
      const cached = cache.get(projectRouting);
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return Promise.resolve(cached.data);
      }

      const existing = inFlightRequests.get(projectRouting);
      if (existing) {
        return existing;
      }

      const promise = fetchWithRetry(projectRouting)
        .then((data) => {
          cache.set(projectRouting, { data, fetchedAt: Date.now() });
          return data;
        })
        .finally(() => {
          inFlightRequests.delete(projectRouting);
        });
      inFlightRequests.set(projectRouting, promise);
      return promise;
    },
  };
}
