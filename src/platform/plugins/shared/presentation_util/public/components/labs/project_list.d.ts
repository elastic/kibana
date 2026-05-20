import React from 'react';
import type { SolutionName, ProjectID, Project } from '../../../common';
import type { Props as ProjectListItemProps } from './project_list_item';
export interface Props {
    solutions?: SolutionName[];
    projects: Record<ProjectID, Project>;
    onStatusChange: ProjectListItemProps['onStatusChange'];
}
export declare const ProjectList: (props: Props) => React.JSX.Element;
