import { Query } from '@elastic/eui';
import React from 'react';
export declare const DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR = "settingsSearchBar";
export declare const CATEGORY_FIELD = "categories";
/**
 * Props for a {@link QueryInput} component.
 */
export interface QueryInputProps {
    categories: string[];
    query?: Query;
    onQueryChange: (query?: Query) => void;
}
export declare const parseErrorMsg: string;
/**
 * Component for displaying a {@link EuiSearchBar} component for filtering settings and setting categories.
 */
export declare const QueryInput: ({ categories: categoryList, query, onQueryChange }: QueryInputProps) => React.JSX.Element;
