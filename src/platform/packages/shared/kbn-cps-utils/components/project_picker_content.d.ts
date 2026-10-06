import type { ComponentProps } from 'react';
import React from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { type ProjectPickerStateProviderProps } from './project_picker_update/state';
import { ProjectPickerFrame } from './project_picker_update/blocks/frame';
import type { ProjectsData } from '../types';
interface ProjectPickerContentBaseProps extends Pick<ProjectPickerStateProviderProps, 'projectRoutingStrategy'>, Pick<ComponentProps<typeof ProjectPickerFrame>, 'showHeader'> {
    projectRouting?: ProjectRouting;
    /**
     * Fetches projects matching a filter-only routing expression.
     */
    fetchProjectsByRouting: (projectRouting?: ProjectRouting) => Promise<ProjectsData | null>;
    maxListHeight?: number;
    customHeaderText?: React.ReactNode;
    /** Whether to show each project's custom tag count badge. Defaults to true. */
    showProjectTags?: boolean;
}
interface ProjectPickerContentEnabledProps extends ProjectPickerContentBaseProps {
    controlsState?: 'enabled';
    onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
}
interface ProjectPickerContentReadOnlyProps extends ProjectPickerContentBaseProps {
    /**
     * Controls the project routing toggle (`All projects` / `This project`):
     * - `disabled`: shown but not interactive
     * - `hidden`: not rendered, leaving a read-only project list
     */
    controlsState: Exclude<NonNullable<ProjectPickerStateProviderProps['controlsState']>, 'enabled'>;
    onProjectRoutingChange?: (projectRouting: ProjectRouting) => void;
}
export type ProjectPickerContentProps = ProjectPickerContentEnabledProps | ProjectPickerContentReadOnlyProps;
export declare const ProjectPickerContent: ({ maxListHeight, projectRouting, onProjectRoutingChange, fetchProjectsByRouting, controlsState, customHeaderText, projectRoutingStrategy, showHeader, showProjectTags, }: ProjectPickerContentProps) => React.JSX.Element;
export {};
