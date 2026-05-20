import type { HttpSetup } from '@kbn/core/public';
export { createProjectFetcher } from './project_fetcher';
/**
 * Resolves the default project routing for the current space.
 * Returns {@link PROJECT_ROUTING.ALL} when the expression doesn't exist (404).
 */
export declare const fetchDefaultProjectRouting: (http: HttpSetup) => Promise<string>;
