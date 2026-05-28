import type { ProjectRouting } from '@kbn/es-query';
import type { Observable } from 'rxjs';
/**
 * Access levels for project routing picker
 */
export declare enum ProjectRoutingAccess {
    /** Cannot interact with picker - picker is disabled */
    DISABLED = "disabled",
    /** Can view but not edit - shows read-only message */
    READONLY = "readonly",
    /** Full functionality - can change project scope */
    EDITABLE = "editable"
}
/**
 * Function that determines the project picker access level for a given location.
 * Apps register one of these via `registerAppAccess` to control picker behavior
 * based on runtime conditions (feature flags, config values, route patterns, etc.).
 */
export type CPSAppAccessResolver = (location: string) => ProjectRoutingAccess;
export interface CPSProject {
    _id: string;
    _alias: string;
    _type: string;
    _organisation: string;
    _csp?: string;
    _region?: string;
    [key: string]: string | undefined;
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
    whenReady(): Promise<void>;
    fetchProjects(projectRouting?: ProjectRouting): Promise<ProjectsData | null>;
    getTotalProjectCount(): number;
    getProjectRouting$(): Observable<ProjectRouting | undefined>;
    setProjectRouting(projectRouting: ProjectRouting | undefined): void;
    /**
     * Returns an explicit override value when provided, regardless of picker access mode.
     * Otherwise resolves routing based on current picker access and CPS state.
     */
    getProjectRouting(overrideValue?: ProjectRouting): ProjectRouting | undefined;
    getDefaultProjectRouting(): ProjectRouting;
    updateDefaultProjectRouting(projectRouting?: ProjectRouting): void;
    getProjectPickerAccess$(): Observable<ProjectRoutingAccess>;
    registerAppAccess(appId: string, resolver: CPSAppAccessResolver): void;
}
