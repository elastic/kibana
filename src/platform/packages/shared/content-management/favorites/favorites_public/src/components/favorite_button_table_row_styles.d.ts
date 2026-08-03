import type { EuiThemeComputed } from '@elastic/eui';
/**
 * CSS to apply to a `EuiBasicTable` row container to show the favorite button
 * on hover or when active.
 *
 * Extracted to its own module (no React, no `FavoriteButton` import) so
 * consumers that only need the row-hover style don't drag the whole
 * `FavoriteButton` + `StardustWrapper` graph into their bundle.
 *
 * @param euiTheme - resolved EUI theme, typically from `useEuiTheme()`.
 */
export declare const cssFavoriteHoverWithinEuiTableRow: (euiTheme: EuiThemeComputed) => import("@emotion/utils").SerializedStyles;
