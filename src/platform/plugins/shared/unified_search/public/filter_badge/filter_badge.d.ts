import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { FilterLabelStatus } from '../filter_bar/filter_item/filter_item';
export interface FilterBadgeProps {
    filter: Filter;
    dataViews: DataView[];
    valueLabel: string;
    hideAlias?: boolean;
    filterLabelStatus: FilterLabelStatus;
    readOnly?: boolean;
}
export declare function FilterBadge({ filter, dataViews, valueLabel, hideAlias, filterLabelStatus, readOnly, ...rest }: FilterBadgeProps): React.JSX.Element;
