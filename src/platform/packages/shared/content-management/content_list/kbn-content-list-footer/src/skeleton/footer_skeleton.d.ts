import React from 'react';
/**
 * Props for {@link FooterSkeleton}.
 */
export interface FooterSkeletonProps {
    /** Optional `data-test-subj`. */
    'data-test-subj'?: string;
}
/**
 * Loading-state placeholder for `ContentListFooter`.
 *
 * Mirrors the real pagination layout: "Rows per page" selector on the
 * left, a row of pagination buttons on the right. Swap-in parity — no
 * vertical shift when the real footer replaces the skeleton.
 */
export declare const FooterSkeleton: ({ "data-test-subj": dataTestSubj, }: FooterSkeletonProps) => React.JSX.Element;
