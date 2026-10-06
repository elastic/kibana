import type { CPSProject } from '../../types';
export declare const getCSPLabel: (csp: string) => string;
export declare const getSolutionIcon: (solution: string) => string;
export declare const getProjectTags: (project: CPSProject) => {
    tagName: string;
    tagValue: string;
}[];
