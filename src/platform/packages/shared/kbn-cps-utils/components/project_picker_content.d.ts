import React from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import type { UseFetchProjectsResult } from './use_fetch_projects';
export interface ProjectPickerContentProps {
    projectRouting?: ProjectRouting;
    onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
    projects: UseFetchProjectsResult;
    isReadonly?: boolean;
}
export declare const ProjectPickerContent: ({ projectRouting, onProjectRoutingChange, projects, isReadonly, }: ProjectPickerContentProps) => React.JSX.Element | null;
