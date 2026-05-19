import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
export interface FavoriteButtonProps {
    id: string;
    className?: string;
}
export declare const FavoriteButton: ({ id, className }: FavoriteButtonProps) => React.JSX.Element | null;
/**
 * CSS to apply to euiTable to show the favorite button on hover or when active
 * @param euiTheme
 */
export declare const cssFavoriteHoverWithinEuiTableRow: (euiTheme: EuiThemeComputed) => import("@emotion/react").SerializedStyles;
