import type { AiGradientColors } from './use_ai_gradient_styles';
export interface SvgAiGradientDefsProps {
    readonly gradientId: string;
    readonly colors: AiGradientColors;
}
/** EUI icons use viewBox="0 0 16 16" regardless of rendered CSS size; userSpaceOnUse coordinates target that viewBox. Gradient angle and bounds are per design spec. */
export declare const SvgAiGradientDefs: ({ gradientId, colors }: SvgAiGradientDefsProps) => JSX.Element;
