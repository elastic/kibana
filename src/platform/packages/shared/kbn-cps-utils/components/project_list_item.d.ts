import React from 'react';
import type { CPSProject } from '../types';
interface ProjectListItemProps {
    project: CPSProject;
    index: number;
    isOriginProject?: boolean;
}
export declare const ProjectListItem: ({ project, index, isOriginProject }: ProjectListItemProps) => React.JSX.Element;
export {};
