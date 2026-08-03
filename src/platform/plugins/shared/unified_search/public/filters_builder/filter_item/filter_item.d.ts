import React from 'react';
import type { Filter } from '@kbn/es-query';
import type { Path } from '../types';
export declare const strings: {
    getDragFilterAriaLabel: () => string;
    getReorderingRequirementsLabel: () => string;
};
export interface FilterItemProps {
    path: Path;
    filter: Filter;
    disableOr: boolean;
    disableAnd: boolean;
    disableRemove: boolean;
    draggable?: boolean;
    color: 'plain' | 'subdued';
    index: number;
    /** @internal used for recursive rendering **/
    renderedLevel: number;
    reverseBackground: boolean;
    filtersCount?: number;
}
export declare function FilterItem({ filter, path, reverseBackground, disableOr, disableAnd, disableRemove, color, index, renderedLevel, draggable, filtersCount, }: FilterItemProps): React.JSX.Element;
