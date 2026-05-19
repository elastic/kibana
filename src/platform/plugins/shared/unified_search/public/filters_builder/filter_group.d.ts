import React from 'react';
import { BooleanRelation, type Filter } from '@kbn/es-query';
import type { Path } from './types';
export declare const strings: {
    getDelimiterLabel: (booleanRelation: BooleanRelation) => string;
};
export interface FilterGroupProps {
    filters: Filter[];
    booleanRelation: BooleanRelation;
    path: Path;
    /** @internal used for recursive rendering **/
    renderedLevel?: number;
    reverseBackground?: boolean;
    filtersCount?: number;
}
export declare const FilterGroup: ({ filters, booleanRelation, path, reverseBackground, renderedLevel, filtersCount, }: FilterGroupProps) => React.JSX.Element;
