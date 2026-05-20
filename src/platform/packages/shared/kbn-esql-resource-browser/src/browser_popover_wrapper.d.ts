import type { EuiSelectableOption } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
export declare const BROWSER_POPOVER_WIDTH = 400;
export declare const BROWSER_POPOVER_HEIGHT = 500;
export declare const MAX_LIST_HEIGHT = 250;
export interface BrowserPopoverWrapperProps<TItem> {
    items: EuiSelectableOption[];
    isOpen: boolean;
    onClose: () => void;
    onCloseComplete?: () => void;
    onSelect: (changedOption: EuiSelectableOption | undefined) => void;
    isFilterOpen: boolean;
    setIsFilterOpen: (isOpen: boolean) => void;
    position?: {
        top?: number;
        left?: number;
    };
    i18nKeys: {
        title: string;
        searchPlaceholder: string;
        filterTitle: string;
        closeLabel: string;
        loading: string;
        empty: string;
        noMatches: string;
    };
    numTypes: number;
    numActiveFilters: number;
    filterPanel: ReactNode;
    isLoading: boolean;
    searchValue: string;
    setSearchValue: (value: string) => void;
    isMultiSelect?: boolean;
    dataTestSubj?: string;
}
export declare function BrowserPopoverWrapper<TItem extends {
    name: string;
}>({ items, isOpen, onClose, onCloseComplete, onSelect, isFilterOpen, setIsFilterOpen, position, i18nKeys, numTypes, numActiveFilters, filterPanel, isLoading, searchValue, setSearchValue, isMultiSelect, dataTestSubj, }: BrowserPopoverWrapperProps<TItem>): React.JSX.Element;
