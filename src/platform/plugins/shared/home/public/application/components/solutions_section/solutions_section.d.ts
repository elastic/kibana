import type { FC } from 'react';
import type { FeatureCatalogueSolution } from '../../..';
interface Props {
    addBasePath: (path: string) => string;
    solutions: FeatureCatalogueSolution[];
}
export declare const SolutionsSection: FC<Props>;
export {};
