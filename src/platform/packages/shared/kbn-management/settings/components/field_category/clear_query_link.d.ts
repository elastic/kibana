import React from 'react';
/**
 * Props for the {@link ClearQueryLink} component.
 */
export interface ClearQueryLinkProps {
    /** The total number of fields in the category. */
    fieldCount: number;
    /** The number of fields currently being displayed. */
    displayCount: number;
    /** Handler to invoke when clearing the current filtering query. */
    onClearQuery: () => void;
}
/**
 * Component for displaying a link to clear the current filtering query.
 */
export declare const ClearQueryLink: ({ fieldCount, displayCount, onClearQuery }: ClearQueryLinkProps) => React.JSX.Element | null;
