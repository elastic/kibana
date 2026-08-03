import React from 'react';
import type { Filter, BooleanRelation, DataViewBase } from '@kbn/es-query';
export interface FilterBadgeGroupProps {
    filters: Filter[];
    dataViews: DataViewBase[];
    filterLabelStatus?: string;
    shouldShowBrackets?: boolean;
    booleanRelation?: BooleanRelation;
}
export declare function FilterBadgeGroup({ filters, dataViews, filterLabelStatus, booleanRelation, shouldShowBrackets, }: FilterBadgeGroupProps): React.JSX.Element;
