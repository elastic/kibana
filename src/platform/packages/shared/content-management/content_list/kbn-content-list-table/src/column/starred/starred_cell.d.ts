import React from 'react';
/** Props for the {@link StarredCell} component. */
export interface StarredCellProps {
    /** Item ID to render the star button for. */
    id: string;
}
/**
 * Cell renderer for `Column.Starred`. Centers the star button in the
 * narrow fixed-width column. The star button is always visible (not hover-only).
 */
export declare const StarredCell: React.MemoExoticComponent<({ id }: StarredCellProps) => React.JSX.Element>;
