import React from 'react';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import type { FilterItemProps } from './filter_item';
/**
 * Properties for the filter items component, which will render a single filter pill for every filter that is sent in
 * as part of the `Filter[]` property.
 */
export interface FilterItemsProps {
    /** Array of filters that will be rendered as filter pills */
    filters: Filter[];
    /** Optional property that controls whether or not clicking the filter pill opens a popover *and* whether
     * or not the `x` button to remove the filter is rendered.*/
    readOnly?: boolean;
    /** If not read only, this is called whenever a filter is removed and/or updated */
    onFiltersUpdated?: (filters: Filter[]) => void;
    /** A list of all dataviews that are used for the filters */
    indexPatterns: DataView[];
    /** This is injected by the lazer loader */
    intl: InjectedIntl;
    /** Controls whether or not filter suggestions are influenced by the global time */
    timeRangeForSuggestionsOverride?: boolean;
    /** adds additional filters to be used for suggestions */
    filtersForSuggestions?: Filter[];
    /** Array of panel options that controls the styling of each filter pill */
    hiddenPanelOptions?: FilterItemProps['hiddenPanelOptions'];
    /** Array of suggestion abstraction that controls the render of the field */
    suggestionsAbstraction?: SuggestionsAbstraction;
}
export declare const FilterItems: React.FC<import("react-intl").WithIntlProps<FilterItemsProps>> & {
    WrappedComponent: React.ComponentType<FilterItemsProps>;
};
