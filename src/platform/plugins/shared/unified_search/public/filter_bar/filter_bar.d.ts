import type { IntlShape } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import type { ReactNode } from 'react';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import { type FilterItemsProps } from './filter_item/filter_items';
import type { IUnifiedSearchPluginServices } from '../types';
export interface Props {
    kibana: KibanaReactContextValue<IUnifiedSearchPluginServices>;
    filters: Filter[];
    onFiltersUpdated?: (filters: Filter[]) => void;
    className?: string;
    indexPatterns: DataView[];
    timeRangeForSuggestionsOverride?: boolean;
    intl: IntlShape;
    filtersForSuggestions?: Filter[];
    hiddenPanelOptions?: FilterItemsProps['hiddenPanelOptions'];
    /**
     * Applies extra styles necessary when coupled with the query bar
     */
    afterQueryBar?: boolean;
    /**
     * Disable all interactive actions
     */
    isDisabled?: boolean;
    /**
     * Prepends custom filter controls to the search bar
     */
    prepend?: ReactNode;
    /** Array of suggestion abstraction that controls the render of the field */
    suggestionsAbstraction?: SuggestionsAbstraction;
}
export declare const FilterBar: React.FC<import("react-intl").WithIntlProps<Omit<Props, "kibana">>> & {
    WrappedComponent: React.ComponentType<Omit<Props, "kibana">>;
};
