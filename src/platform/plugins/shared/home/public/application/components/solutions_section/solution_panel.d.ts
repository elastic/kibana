import type { FC } from 'react';
import type { FeatureCatalogueSolution } from '../../..';
interface Props {
    addBasePath: (path: string) => string;
    solution: FeatureCatalogueSolution;
}
export declare const SolutionPanel: FC<Props>;
export {};
