import React from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import type { UseFetchProjectsResult } from './use_fetch_projects';
export interface ProjectPickerProps {
    projectRouting?: ProjectRouting;
    onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
    projects: UseFetchProjectsResult;
    totalProjectCount: number;
    isReadonly?: boolean;
    settingsComponent?: React.ReactNode;
}
export declare const ProjectPicker: ({ projectRouting, onProjectRoutingChange, projects, totalProjectCount, isReadonly, settingsComponent, }: ProjectPickerProps) => React.JSX.Element | null;
export declare const ProjectPickerSkeleton: () => React.JSX.Element;
export declare const DisabledProjectPicker: ({ totalProjectCount }: {
    totalProjectCount: number;
}) => React.JSX.Element | null;
