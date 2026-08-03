import React from 'react';
import type { ReactElement } from 'react';
import type { SelectableListItem, SelectableListProps, SelectableListSearchConfig } from '../selectable_list';
import type { ActionConfig } from '../types';
export interface SpacesListViewProps {
    readonly id: string;
    readonly title: string;
    readonly headerAction?: ActionConfig;
    readonly items: ReadonlyArray<SelectableListItem>;
    readonly search?: SelectableListSearchConfig;
    readonly isLoading?: boolean;
    readonly loadingMessage?: string;
    readonly noMatchesMessage?: ReactElement;
    readonly footerAction?: ActionConfig;
    readonly onBack?: () => void;
    readonly onSelect: SelectableListProps['onSelect'];
}
/**
 * The list view for the spaces that contains the title, the selectable list and the footer action.
 */
export declare const SpacesListView: ({ id, title, onBack, headerAction, items, onSelect, search, isLoading, loadingMessage, noMatchesMessage, footerAction, }: SpacesListViewProps) => React.JSX.Element;
