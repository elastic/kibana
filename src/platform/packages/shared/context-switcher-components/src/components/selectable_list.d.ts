import React from 'react';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { EuiSelectable } from '@elastic/eui';
type EuiSelectableChangeHandler = NonNullable<ComponentProps<typeof EuiSelectable>['onChange']>;
type EuiSelectableChangeEvent = Parameters<EuiSelectableChangeHandler>[1];
export interface SelectableListSearchConfig {
    readonly enabled: boolean;
    readonly props?: ComponentProps<typeof EuiSelectable>['searchProps'];
}
export interface SelectableListItem {
    readonly id: string;
    readonly label: string;
    readonly prepend?: ReactNode;
    readonly append?: ReactNode;
    readonly checked?: boolean;
    readonly disabled?: boolean;
    readonly className?: string;
    readonly ['data-test-subj']?: string;
}
export interface SelectableListProps {
    readonly id: string;
    readonly items: ReadonlyArray<SelectableListItem>;
    readonly isLoading?: boolean;
    readonly loadingMessage?: string;
    readonly noMatchesMessage?: ReactElement;
    readonly search?: SelectableListSearchConfig;
    readonly onSelect: (args: {
        readonly item: SelectableListItem;
        readonly event: EuiSelectableChangeEvent;
        readonly previousSelectedId?: string;
    }) => void;
    readonly children?: (nodes: {
        readonly list: ReactNode;
        readonly search?: ReactNode;
    }) => ReactNode;
}
/**
 * Generic selectable list for context-switcher:
 * - Single selection (always)
 * - Optional search UI
 * - Supports prepend/append per item
 */
export declare const SelectableList: ({ id, items, isLoading, loadingMessage, noMatchesMessage, search, onSelect, children, }: SelectableListProps) => React.JSX.Element;
export {};
