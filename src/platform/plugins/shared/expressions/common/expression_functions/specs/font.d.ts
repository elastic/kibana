import type { ExpressionFunctionDefinition } from '../types';
import type { FontLabel as FontFamily } from '../../fonts';
import type { Style } from '../../types';
import type { FontWeight, TextAlignment } from '../../types';
export interface FontArguments {
    align?: TextAlignment;
    color?: string;
    family?: FontFamily;
    italic?: boolean;
    lHeight?: number | null;
    size?: number;
    underline?: boolean;
    weight?: FontWeight;
    sizeUnit?: string;
}
export type ExpressionFunctionFont = ExpressionFunctionDefinition<'font', null, FontArguments, Style>;
export declare const font: ExpressionFunctionFont;
