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
export declare const useFetchProjects: (fetchProjects: (routing?: ProjectRouting) => Promise<ProjectsData | null>, routing?: ProjectRouting) => UseFetchProjectsResult;
