import React from 'react';
import { type EbtClickAttrs } from '@kbn/ebt-click';
interface DependencyNameLinkProps {
    dependencyName: string;
    spanType?: string;
    spanSubtype?: string;
    environment?: string;
    formattedDependencyName?: React.ReactNode;
    ebt: Omit<EbtClickAttrs, 'action'>;
}
export declare function DependencyNameLink({ dependencyName, spanType, spanSubtype, environment, formattedDependencyName, ebt, }: DependencyNameLinkProps): React.JSX.Element;
export {};
