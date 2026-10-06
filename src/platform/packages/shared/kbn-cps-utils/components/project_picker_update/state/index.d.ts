import React, { type PropsWithChildren } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { type ActionsFromReducers } from './store';
import { createStoreReducers } from './reducers';
import { type ProjectPickerState } from './reducers';
import { type CPSProject, type ProjectsData } from '../../../types';
import { type ProjectRoutingStrategy } from '../utils';
interface ProjectPickerContext {
    state: ProjectPickerState;
    actions: Omit<ActionsFromReducers<ReturnType<typeof createStoreReducers>>, '_setStoreState' | '_setControlsState' | '_setProjectRoutingStrategy' | '_commitProposedFilters' | '_setFilterSearchLoading' | '_setFilterSearchError'>;
    fetchProjectsByRouting: (projectRouting?: ProjectRouting) => Promise<ProjectsData | null>;
}
export interface ProjectPickerStateProviderProps extends Pick<ProjectPickerState, 'originProjectId'> {
    children: React.ReactNode;
    /**
     * Controls if the control button for toggling the project routing picker.
     * @default 'enabled'
     *
     * - `enabled`: shown and interactive
     * - `disabled`: shown but not interactive
     * - `hidden`: not rendered, leaving a read-only project list
     */
    controlsState?: ProjectPickerState['controlsState'];
    availableProjects: CPSProject[];
    /**
     * Returns the app's current project routing. Contract: the returned value must reflect
     * routings previously delivered via {@link ProjectPickerStateProviderProps.onProjectRoutingChange}
     * (i.e. the consumer round-trips reported values back into this getter).
     */
    currentProjectRoutingGetter: () => ProjectRouting | undefined;
    defaultProjectRoutingGetter: () => ProjectRouting;
    /**
     * Fetches projects matching a project routing expression. Used for filter-expression
     * server search; must not be used for exclusion-only changes.
     */
    fetchProjectsByRouting: (projectRouting?: ProjectRouting) => Promise<ProjectsData | null>;
    /**
     * Controls how project IDs are encoded into the routing string.
     *
     * - `dynamic` (default): `_id:*` with exclusions. Filter rules stay live;
     *   newly linked projects can match without re-saving.
     * - `snapshot`: explicit `_id:…` clauses for each selected project.
     *   Resulting in a routing query that is frozen to the current selection. Having this is useful in configuring space defaults.
     *
     * @default 'dynamic'
     */
    projectRoutingStrategy?: Omit<ProjectRoutingStrategy, 'unknown'>;
    /**
     * Callback function invoked with the project routing string when the project selection changes
     */
    onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
}
export declare const createProjectPickerContext: () => React.Context<ProjectPickerContext | null>;
export declare const useProjectPickerContext: () => ProjectPickerContext;
export declare const useProjectPickerActions: () => Omit<ActionsFromReducers<{
    readonly _setStoreState: (state: ProjectPickerState, payload: Pick<ProjectPickerState, 'availableProjects'> & {
        defaultProjectRouting?: ProjectRouting;
        filterExpressions?: import("../utils").FilterExpressionValue[];
        excludedOverrides?: string[];
    }) => {
        controlsState: import("./reducers").ProjectPickerControlsState;
        originProjectId?: string;
        defaultProjectRouting: ProjectRouting;
        projectRoutingStrategy: Omit<ProjectRoutingStrategy, 'unknown'>;
        hasUserModifiedRouting: boolean;
        filteringDimensions: string[];
        filterExpressions: Map<string, import("./reducers").FilterEntry>;
        excludedOverrides: string[];
        proposedFilters: import("./reducers").ProposedFilters | null;
        currentProjectRouting: ProjectRouting;
        isUsingSpaceDefaults: boolean;
        filteredProjectIds: string[];
        isFilterSearchLoading: boolean;
        filterSearchError: Error | null;
        visibleProjectIds: string[];
        selectedProjectIds: string[];
        displayedFilterExpressions: Map<string, import("./reducers").FilterEntry>;
        isFilterProposalPending: boolean;
        availableProjects: Map<string, CPSProject>;
    };
    readonly _setControlsState: (state: ProjectPickerState, payload: Pick<ProjectPickerState, 'controlsState'>) => ProjectPickerState;
    readonly _setProjectRoutingStrategy: (state: ProjectPickerState, payload: Pick<ProjectPickerState, 'projectRoutingStrategy'>) => ProjectPickerState;
    readonly _commitProposedFilters: (state: ProjectPickerState, payload: {
        filteredProjectIds: string[];
    }) => ProjectPickerState;
    readonly _setFilterSearchLoading: (state: ProjectPickerState) => ProjectPickerState;
    readonly _setFilterSearchError: (state: ProjectPickerState, payload: {
        error: Error;
    }) => {
        controlsState: import("./reducers").ProjectPickerControlsState;
        originProjectId?: string;
        defaultProjectRouting: ProjectRouting;
        projectRoutingStrategy: Omit<ProjectRoutingStrategy, 'unknown'>;
        hasUserModifiedRouting: boolean;
        filteringDimensions: string[];
        filterExpressions: Map<string, import("./reducers").FilterEntry>;
        availableProjects: Map<CPSProject['_id'], CPSProject>;
        excludedOverrides: string[];
        proposedFilters: import("./reducers").ProposedFilters | null;
        currentProjectRouting: ProjectRouting;
        isUsingSpaceDefaults: boolean;
        filteredProjectIds: string[];
        visibleProjectIds: string[];
        selectedProjectIds: string[];
        displayedFilterExpressions: Map<string, import("./reducers").FilterEntry>;
        isFilterProposalPending: boolean;
        filterSearchError: Error;
        isFilterSearchLoading: boolean;
    };
    readonly addFilterExpression: import("./store").StoreReducer<ProjectPickerState, {
        expression: import("../utils").FilterExpressionValue;
    }>;
    readonly updateFilterExpression: import("./store").StoreReducer<ProjectPickerState, {
        id: string;
        expression: import("../utils").FilterExpressionValue;
    }>;
    readonly removeFilterExpression: import("./store").StoreReducer<ProjectPickerState, {
        filterId: string;
    }>;
    readonly toggleFilterExpression: import("./store").StoreReducer<ProjectPickerState, {
        filterId: string;
    }>;
    readonly invertFilterExpressionOperator: import("./store").StoreReducer<ProjectPickerState, {
        filterId: string;
    }>;
    readonly clearProjectFilters: import("./store").StoreReducer<ProjectPickerState, void>;
    readonly excludeSelectedProjects: import("./store").StoreReducer<ProjectPickerState, {
        projects: string[];
    }>;
    readonly undoProjectExclusion: import("./store").StoreReducer<ProjectPickerState, {
        projects: string[];
    }>;
    readonly revertToSpaceDefaults: import("./store").StoreReducer<ProjectPickerState, void>;
    readonly includeAllVisibleProjects: import("./store").StoreReducer<ProjectPickerState, void>;
    readonly includeOnlyProvidedProjectId: import("./store").StoreReducer<ProjectPickerState, {
        anchorProjectId: string;
    }>;
    readonly excludeOnlyProvidedProjectId: import("./store").StoreReducer<ProjectPickerState, {
        anchorProjectId: string;
    }>;
}>, "_commitProposedFilters" | "_setControlsState" | "_setFilterSearchError" | "_setFilterSearchLoading" | "_setProjectRoutingStrategy" | "_setStoreState">;
export declare const useProjectPickerState: () => ProjectPickerState;
export declare const useFetchProjectsByRouting: () => (projectRouting?: ProjectRouting) => Promise<ProjectsData | null>;
export declare const ProjectPickerStateProvider: ({ children, availableProjects, controlsState, originProjectId, onProjectRoutingChange, projectRoutingStrategy, defaultProjectRoutingGetter, currentProjectRoutingGetter, fetchProjectsByRouting, }: PropsWithChildren<ProjectPickerStateProviderProps>) => React.JSX.Element;
export {};
