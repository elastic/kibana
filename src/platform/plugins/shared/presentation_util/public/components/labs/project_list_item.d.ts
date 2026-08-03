import React from 'react';
import type { ProjectID, EnvironmentName, Project } from '../../../common/labs';
export interface Props {
    project: Project;
    onStatusChange: (id: ProjectID, env: EnvironmentName, enabled: boolean) => void;
}
export declare const ProjectListItem: ({ project, onStatusChange }: Props) => React.JSX.Element;
