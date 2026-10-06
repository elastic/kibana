import type { HttpSetup } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { ProjectsData } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
export declare const CACHE_TTL_MS = 15000;
export interface ProjectFetcher {
    fetchProjects: (projectRouting?: ProjectRouting) => Promise<ProjectsData | null>;
}
export declare function createProjectFetcher(http: HttpSetup, logger: Logger): ProjectFetcher;
