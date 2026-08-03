export declare const LABS_PROJECT_PREFIX = "labs:";
export declare const DEFER_BELOW_FOLD: "labs:dashboard:deferBelowFold";
export declare const BY_VALUE_EMBEDDABLE: "labs:canvas:byValueEmbeddable";
export declare const projectIDs: readonly ["labs:dashboard:deferBelowFold", "labs:canvas:byValueEmbeddable"];
export declare const environmentNames: readonly ["kibana", "browser", "session"];
export declare const solutionNames: readonly ["canvas", "dashboard", "presentation"];
/**
 * This is a list of active Labs Projects for the Presentation Team.  It is the "source of truth" for all projects
 * provided to users of our solutions in Kibana.
 */
export declare const projects: {
    [ID in ProjectID]: ProjectConfig & {
        id: ID;
    };
};
export type ProjectID = (typeof projectIDs)[number];
export type EnvironmentName = (typeof environmentNames)[number];
export type SolutionName = (typeof solutionNames)[number];
export type EnvironmentStatus = {
    [env in EnvironmentName]?: boolean;
};
export type ProjectStatus = {
    defaultValue: boolean;
    isEnabled: boolean;
    isOverride: boolean;
} & EnvironmentStatus;
export interface ProjectConfig {
    id: ProjectID;
    name: string;
    isActive: boolean;
    isDisplayed: boolean;
    environments: EnvironmentName[];
    description: string;
    solutions: SolutionName[];
}
export type Project = ProjectConfig & {
    status: ProjectStatus;
};
export declare const getProjectIDs: () => readonly ["labs:dashboard:deferBelowFold", "labs:canvas:byValueEmbeddable"];
export declare const isProjectEnabledByStatus: (active: boolean, status: EnvironmentStatus) => boolean;
