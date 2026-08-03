import React from 'react';
import type { SerializedStyles } from '@emotion/react';
/** Props for the {@link StarButton} component. */
export interface StarButtonProps {
    /** Item ID to star/unstar. */
    id: string;
    /** Optional CSS `className` for alignment styles. */
    className?: string;
    /**
     * Optional Emotion styles applied to a wrapping `span`.
     * Use for margin adjustments when rendered inline (e.g. inside {@link NameCell}).
     */
    wrapperCss?: SerializedStyles;
}
/**
 * Thin wrapper around `FavoriteButton` that renders `null` when
 * `supports.starred` is false. Shared by `StarredCell` and `NameCell`.
 */
export declare const StarButton: (props: StarButtonProps) => React.JSX.Element | null;
