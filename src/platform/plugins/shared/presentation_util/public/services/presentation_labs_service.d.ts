import type { EnvironmentName, EnvironmentStatus, Project, ProjectConfig, ProjectID, SolutionName } from '../../common';
export interface PresentationLabsService {
    isProjectEnabled: (id: ProjectID) => boolean;
    getProject: (id: ProjectID) => Project;
    getProjects: (solutions?: SolutionName[]) => Record<ProjectID, Project>;
    setProjectStatus: (id: ProjectID, env: EnvironmentName, status: boolean) => void;
    reset: () => void;
}
export declare const getPresentationLabsService: () => PresentationLabsService;
export declare const applyProjectStatus: (project: ProjectConfig, status: EnvironmentStatus) => Project;
