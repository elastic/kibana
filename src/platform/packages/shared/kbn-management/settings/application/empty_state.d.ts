import React from 'react';
export declare const DATA_TEST_SUBJ_SETTINGS_EMPTY_STATE = "settingsEmptyState";
export declare const DATA_TEST_SUBJ_SETTINGS_CLEAR_SEARCH_LINK = "settingsClearSearchLink";
/**
 * Props for a {@link EmptyState} component.
 */
interface EmptyStateProps {
    queryText: string | undefined;
    onClearQuery: () => void;
}
/**
 * Component for displaying a prompt to inform that no settings are found for a given query.
 */
export declare const EmptyState: ({ queryText, onClearQuery }: EmptyStateProps) => React.JSX.Element;
export {};
