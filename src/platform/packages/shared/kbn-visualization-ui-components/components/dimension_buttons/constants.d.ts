export declare const emptyTitleText: string;
/**
 * Maximum number of distinct colors to render in a palette indicator.
 *
 * Rationale:
 * - Inline indicators are small; beyond this threshold individual colors
 *   become hard to distinguish and add little informative value.
 * - Limiting the count helps maintain consistent layout and avoids
 *   potential rendering/performance issues when many colors are provided.
 *
 * Keep this value conservative to preserve readability and UX.
 */
export declare const MAX_PALETTE_INDICATOR_COLORS = 20;
