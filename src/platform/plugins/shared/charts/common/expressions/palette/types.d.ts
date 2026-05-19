import type { PaletteContinuity } from '@kbn/coloring';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
export interface PaletteOutput<T = {
    [key: string]: unknown;
}> {
    type: 'palette' | 'system_palette';
    name: string;
    params?: T;
}
export interface CustomPaletteArguments {
    color?: string[];
    gradient: boolean;
    reverse?: boolean;
    stop?: number[];
    range?: 'number' | 'percent';
    rangeMin?: number;
    rangeMax?: number;
    continuity?: PaletteContinuity;
}
export interface CustomPaletteState {
    colors: string[];
    gradient: boolean;
    stops: number[];
    range: 'number' | 'percent';
    rangeMin: number;
    rangeMax: number;
    continuity?: PaletteContinuity;
}
export type PaletteExpressionFunctionDefinition = ExpressionFunctionDefinition<'palette', null, CustomPaletteArguments, Promise<PaletteOutput<CustomPaletteState>>>;
export interface SystemPaletteArguments {
    name: string;
}
export type SystemPaletteExpressionFunctionDefinition = ExpressionFunctionDefinition<'system_palette', null, SystemPaletteArguments, PaletteOutput>;
