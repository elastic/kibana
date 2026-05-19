import type { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import type { UserProfileWithAvatar } from './user_avatar';
/**
 * Props of {@link UserProfilesSelectable} component
 */
export interface UserProfilesSelectableProps<Option extends UserProfileWithAvatar | null> extends Pick<EuiSelectableProps, 'height' | 'singleSelection' | 'loadingMessage' | 'noMatchesMessage' | 'emptyMessage' | 'errorMessage' | 'data-test-subj'> {
    /**
     * List of users to be rendered as suggestions.
     */
    defaultOptions?: Option[];
    /**
     * List of selected users or `null` (no users).
     */
    selectedOptions?: Option[];
    /**
     * List of users from search results. Should be updated based on the search term provided by `onSearchChange` callback.
     */
    options?: Option[];
    /**
     * Maximum number of users allowed to be selected.
     *
     * This limit is not enforced and only used to show a warning message.
     */
    limit?: number;
    /**
     * Passes back the current selection.
     * @param options Either the list of selected users or `null` (no users).
     */
    onChange?(options: Option[]): void;
    /**
     * Passes back the search term.
     * @param searchTerm Search term
     */
    onSearchChange?(searchTerm: string): void;
    /**
     * Loading indicator for asynchronous search operations.
     */
    isLoading?: boolean;
    /**
     * Placeholder text of search field.
     */
    searchPlaceholder?: string;
    /**
     * Identifier of search field.
     */
    searchInputId?: string;
    /**
     * Returns message for number of selected users.
     * @param selectedCount Number of selected users
     */
    selectedStatusMessage?(selectedCount: number): ReactNode;
    /**
     * Returns message when maximum number of selected users are reached.
     * @param limit Maximum number of users allowed to be selected
     */
    limitReachedMessage?(limit: number): ReactNode;
    /**
     * Label for clear button.
     */
    clearButtonLabel?: ReactNode;
    /**
     * Label of "no users" option.
     */
    nullOptionLabel?: string;
    /**
     * Additional props for "no users" option.
     */
    nullOptionProps?: NullOptionProps;
    /**
     * Label for default options group separator.
     */
    defaultOptionsLabel?: string;
}
/**
 * Renders a selectable component given a list of user profiles
 */
export declare const UserProfilesSelectable: <Option extends UserProfileWithAvatar | null>({ selectedOptions, defaultOptions, options, onChange, onSearchChange, isLoading, singleSelection, limit, height, loadingMessage, noMatchesMessage, emptyMessage, errorMessage, searchPlaceholder, searchInputId, selectedStatusMessage, limitReachedMessage, nullOptionLabel, nullOptionProps, defaultOptionsLabel, clearButtonLabel, ...props }: UserProfilesSelectableProps<Option>) => React.JSX.Element;
export type NullOptionProps = Partial<Pick<EuiSelectableOption, 'append'>>;
