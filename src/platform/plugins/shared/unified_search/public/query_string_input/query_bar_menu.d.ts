import type { RefObject } from 'react';
import React from 'react';
import type { EuiButtonIconProps } from '@elastic/eui';
import type { EuiContextMenuClass } from '@elastic/eui/src/components/context_menu/context_menu';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedQueryService, SavedQuery, SavedQueryTimeFilter } from '@kbn/data-plugin/public';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import type { QueryBarMenuPanelsProps, AdditionalQueryBarMenuItems } from './query_bar_menu_panels';
import type { WithCloseFilterEditorConfirmModalProps } from '../filter_bar/filter_editor';
export declare const strings: {
    getFilterSetButtonLabel: () => string;
    getSavedQueryPopoverSaveChangesButtonText: () => string;
};
export interface QueryBarMenuProps extends WithCloseFilterEditorConfirmModalProps {
    language: string;
    onQueryChange: (payload: {
        dateRange: TimeRange;
        query?: Query;
    }) => void;
    onQueryBarSubmit: (payload: {
        dateRange: TimeRange;
        query?: Query;
    }) => void;
    toggleFilterBarMenuPopover: (value: boolean) => void;
    openQueryBarMenu: boolean;
    nonKqlMode?: 'lucene' | 'text';
    disableQueryLanguageSwitcher?: boolean;
    dateRangeFrom?: string;
    dateRangeTo?: string;
    timeFilter?: SavedQueryTimeFilter;
    savedQueryService: SavedQueryService;
    saveAsNewQueryFormComponent?: JSX.Element;
    saveFormComponent?: JSX.Element;
    manageFilterSetComponent?: JSX.Element;
    hiddenPanelOptions?: QueryBarMenuPanelsProps['hiddenPanelOptions'];
    onFiltersUpdated?: (filters: Filter[]) => void;
    filters?: Filter[];
    additionalQueryBarMenuItems: AdditionalQueryBarMenuItems;
    query?: Query;
    savedQuery?: SavedQuery;
    onClearSavedQuery?: () => void;
    showQueryInput?: boolean;
    showFilterBar?: boolean;
    showSaveQuery?: boolean;
    showSavedQueryControls?: boolean;
    timeRangeForSuggestionsOverride?: boolean;
    filtersForSuggestions?: Filter[];
    indexPatterns?: Array<DataView | string>;
    buttonProps?: Partial<EuiButtonIconProps>;
    isDisabled?: boolean;
    suggestionsAbstraction?: SuggestionsAbstraction;
    renderQueryInputAppend?: () => React.ReactNode;
    queryBarMenuRef: RefObject<EuiContextMenuClass>;
}
export declare const QueryBarMenu: (props: Omit<QueryBarMenuProps, keyof WithCloseFilterEditorConfirmModalProps>) => React.JSX.Element;
