import React from 'react';
import type { Filter, DataViewBase } from '@kbn/es-query';
export interface FilterBadgeExpressionProps {
    filter: Filter;
    shouldShowBrackets?: boolean;
    dataViews: DataViewBase[];
    filterLabelStatus?: string;
}
export declare function FilterExpressionBadge({ filter, shouldShowBrackets, dataViews, filterLabelStatus, }: FilterBadgeExpressionProps): React.JSX.Element;
