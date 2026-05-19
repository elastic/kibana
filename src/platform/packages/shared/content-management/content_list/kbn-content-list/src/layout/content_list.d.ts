import React, { type ReactNode } from 'react';
/**
 * Props for {@link ContentList}.
 */
export interface ContentListProps {
    /**
     * Sections laid out inside a flex-column container with consistent gap
     * between them. Typical children are `<ContentListToolbar />`,
     * `<ContentListTable />`, and `<ContentListFooter />`.
     */
    children: ReactNode;
    /**
     * Rendered in place of `children` when the phase is `'empty'`. When omitted,
     * `ContentList` renders a provider-aware default prompt. Pass `null` to
     * intentionally suppress the empty-state region.
     */
    emptyState?: ReactNode;
    /** Optional `data-test-subj`. */
    'data-test-subj'?: string;
}
/**
 * Layout shell for a Content List.
 */
export declare const ContentList: ({ children, emptyState, "data-test-subj": dataTestSubj, }: ContentListProps) => React.JSX.Element;
