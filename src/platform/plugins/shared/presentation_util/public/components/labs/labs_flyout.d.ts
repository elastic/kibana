import React from 'react';
import type { Project, ProjectID, SolutionName } from '../../../common';
export interface Props {
    onClose: () => void;
    solutions?: SolutionName[];
    onEnabledCountChange?: (overrideCount: number) => void;
}
export declare const getOverridenCount: (projects: Record<ProjectID, Project>) => number;
export declare const LabsFlyout: (props: Props) => React.JSX.Element;
export default LabsFlyout;
