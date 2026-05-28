import type { HttpSetup } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { ProjectsData } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
export declare const CACHE_TTL_MS = 15000;
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
export declare function createProjectFetcher(http: HttpSetup, logger: Logger): ProjectFetcher;
