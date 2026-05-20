import type { RefObject } from 'react';
import type { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { SavedQueryService, SavedQuery, SavedQueryTimeFilter } from '@kbn/data-plugin/public';
import type { EuiContextMenuClass } from '@elastic/eui/src/components/context_menu/context_menu';
import type { FilterPanelOption } from '../types';
export declare const strings: {
    getLuceneLanguageName: () => string;
    getKqlLanguageName: () => string;
    getOptionsApplyAllFiltersButtonLabel: () => string;
    getLoadOtherFilterSetLabel: () => string;
    getLoadCurrentFilterSetLabel: () => string;
    getSaveAsNewFilterSetLabel: () => string;
    getSaveFilterSetLabel: () => string;
    getClearAllFiltersButtonLabel: () => string;
    getSavedQueryPopoverSaveChangesButtonAriaLabel: (title?: string) => string;
    getSavedQueryPopoverSaveChangesButtonText: () => string;
    getSavedQueryPopoverSaveAsNewButtonAriaLabel: () => string;
    getSavedQueryPopoverSaveAsNewButtonText: () => string;
    getSaveCurrentFilterSetLabel: () => string;
    getApplyAllFiltersButtonLabel: () => string;
    getEnableAllFiltersButtonLabel: () => string;
    getDisableAllFiltersButtonLabel: () => string;
    getInvertNegatedFiltersButtonLabel: () => string;
    getPinAllFiltersButtonLabel: () => string;
    getUnpinAllFiltersButtonLabel: () => string;
    getFilterLanguageLabel: () => string;
    getQuickFiltersLabel: () => string;
};
export declare enum QueryBarMenuPanel {
    main = "main",
    applyToAllFilters = "applyToAllFilters",
    updateCurrentQuery = "updateCurrentQuery",
    saveAsNewQuery = "saveAsNewQuery",
    loadQuery = "loadQuery",
    selectLanguage = "selectLanguage"
}
export interface AdditionalQueryBarMenuItems {
    items?: EuiContextMenuPanelItemDescriptor[];
    panels?: EuiContextMenuPanelDescriptor[];
}
export interface QueryBarMenuPanelsProps {
    filters?: Filter[];
    additionalQueryBarMenuItems: AdditionalQueryBarMenuItems;
    savedQuery?: SavedQuery;
    language: string;
    dateRangeFrom?: string;
    dateRangeTo?: string;
    timeFilter?: SavedQueryTimeFilter;
    query?: Query;
    showSaveQuery?: boolean;
    showSavedQueryControls?: boolean;
    showQueryInput?: boolean;
    showFilterBar?: boolean;
    savedQueryService: SavedQueryService;
    saveFormComponent?: JSX.Element;
    saveAsNewQueryFormComponent?: JSX.Element;
    manageFilterSetComponent?: JSX.Element;
    hiddenPanelOptions?: FilterPanelOption[];
    nonKqlMode?: 'lucene' | 'text';
    disableQueryLanguageSwitcher?: boolean;
    queryBarMenuRef: RefObject<EuiContextMenuClass>;
    closePopover: () => void;
    onQueryBarSubmit: (payload: {
        dateRange: TimeRange;
        query?: Query;
    }) => void;
    onFiltersUpdated?: (filters: Filter[]) => void;
    onClearSavedQuery?: () => void;
    onQueryChange: (payload: {
        dateRange: TimeRange;
        query?: Query;
    }) => void;
    setRenderedComponent: (component: string) => void;
}
export declare function useQueryBarMenuPanels({ filters, additionalQueryBarMenuItems, savedQuery, language, dateRangeFrom, dateRangeTo, timeFilter, query, showSaveQuery, showSavedQueryControls, showFilterBar, showQueryInput, savedQueryService, saveFormComponent, saveAsNewQueryFormComponent, manageFilterSetComponent, hiddenPanelOptions, nonKqlMode, disableQueryLanguageSwitcher, queryBarMenuRef, closePopover, onQueryBarSubmit, onFiltersUpdated, onClearSavedQuery, onQueryChange, setRenderedComponent, }: QueryBarMenuPanelsProps): EuiContextMenuPanelDescriptor[];
