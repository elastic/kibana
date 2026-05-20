import type { CSSInterpolation } from '@emotion/serialize';
import type { UseEuiTheme } from '@elastic/eui';
export type EmotionStyles = Record<string, CSSInterpolation | ((theme: UseEuiTheme) => CSSInterpolation)>;
/**
 * Custom hook to reduce boilerplate when working with Emotion styles that may depend on
 * the EUI theme.
 *
 * Accepts a map of styles where each entry is either a static Emotion style (via `css`)
 * or a function that returns styles based on the current `euiTheme`.
 *
 * It returns a memoized version of the style map with all values resolved to static
 * Emotion styles, allowing components to use a clean and unified object for styling.
 *
 * This helps simplify component code by centralizing theme-aware style logic.
 *
 * Example usage:
 *   const componentStyles = {
 *     container: css({ overflow: hidden }),
 *     leftPane: ({ euiTheme }) => css({ paddingTop: euiTheme.size.m }),
 *   }
 *   const styles = useMemoCss(componentStyles);
 */
export declare const useMemoCss: <T extends EmotionStyles>(styleMap: T) => { [K in keyof T]: CSSInterpolation; };
