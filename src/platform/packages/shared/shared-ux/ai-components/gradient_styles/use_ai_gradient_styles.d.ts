import { type SerializedStyles } from '@emotion/react';
/** Visual variants that affect AI gradient colors. */
export type AiButtonVariant = 'accent' | 'base' | 'empty' | 'outlined';
/** Options for the AI button gradient hooks. */
export interface AiButtonGradientOptions {
    readonly variant?: AiButtonVariant;
    readonly iconOnly?: boolean;
}
/** Computed gradient styles for an AI button. */
export interface AiButtonGradientStyles {
    readonly buttonCss: SerializedStyles;
    readonly labelCss: SerializedStyles;
}
/** Start and end colors for a linear gradient. */
export interface AiGradientColors {
    readonly startColor: string;
    readonly endColor: string;
}
/** SVG gradient for the AI button icon. */
export interface SvgAiGradient {
    readonly iconGradientCss?: SerializedStyles;
    readonly gradientId: string;
    readonly colors: AiGradientColors;
}
export declare const useAiButtonGradientStyles: ({ variant, iconOnly, }?: AiButtonGradientOptions) => AiButtonGradientStyles;
export declare const useSvgAiGradient: ({ variant }?: AiButtonGradientOptions) => SvgAiGradient;
