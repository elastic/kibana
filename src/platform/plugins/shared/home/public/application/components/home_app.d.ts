import React from 'react';
import type { FeatureCatalogueEntry, FeatureCatalogueSolution } from '../../services';
export interface HomeAppProps {
    directories: FeatureCatalogueEntry[];
    solutions: FeatureCatalogueSolution[];
}
export declare function HomeApp({ directories, solutions }: HomeAppProps): React.JSX.Element;
