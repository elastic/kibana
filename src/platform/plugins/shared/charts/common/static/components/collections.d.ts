import type { $Values } from '@kbn/utility-types';
export declare const ColorMode: Readonly<{
    Background: "Background";
    Labels: "Labels";
    None: "None";
}>;
export type ColorMode = $Values<typeof ColorMode>;
export declare const LabelRotation: Readonly<{
    Horizontal: 0;
    Vertical: 90;
    Angled: 75;
    VerticalRotation: 270;
}>;
export type LabelRotation = $Values<typeof LabelRotation>;
export declare const defaultCountLabel: string;
