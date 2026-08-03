import type { UseEuiTheme } from '@elastic/eui';
/**
 * Base styling for the inline `type:` highlight the decorations add, matching
 * the workflow editor: a subtle rounded "pill" around the type value plus the
 * `::after` box the per-type icon CSS fills with a `background-image`.
 */
export declare const getTypeIconBaseStyles: (euiThemeContext: UseEuiTheme) => import("@emotion/utils").SerializedStyles;
