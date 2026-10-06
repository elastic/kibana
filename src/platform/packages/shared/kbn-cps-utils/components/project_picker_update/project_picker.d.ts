import React, { type ComponentProps } from 'react';
import { type ProjectPickerStateProviderProps } from './state';
export declare function ProjectPicker({ availableProjects, controlsState, originProjectId, projectRouting, onProjectRoutingChange, fetchProjectsByRouting, projectRoutingStrategy, }: Omit<ProjectPickerStateProviderProps, 'children' | 'currentProjectRoutingGetter' | 'defaultProjectRoutingGetter'> & {
    projectRouting: string;
}): React.JSX.Element;
export type ProjectPickerProps = ComponentProps<typeof ProjectPicker>;
