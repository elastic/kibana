import React from 'react';
import type { ReactNode } from 'react';
/**
 * Props for the {@link ContentListToolbar} component.
 */
export interface ContentListToolbarProps {
    /** Optional children for declarative configuration via {@link Filters}. */
    children?: ReactNode;
    /** Optional `data-test-subj` attribute for testing. */
    'data-test-subj'?: string;
}
export declare const ContentListToolbar: (({ children, "data-test-subj": dataTestSubj, }: ContentListToolbarProps) => React.JSX.Element) & {
    Filters: React.FC<import("./filters").FiltersProps> & {
        Sort: React.FC<import("./filters").SortFilterProps>;
        Tags: React.FC<import("./filters").TagFilterProps>;
        Starred: React.FC<import("./filters").StarredFilterProps>;
        CreatedBy: React.FC<import("./filters/part").CreatedByFilterProps>;
    };
    SelectionBar: ({ "data-test-subj": dataTestSubj, }: import("./selection_bar").SelectionBarProps) => React.JSX.Element | null;
};
