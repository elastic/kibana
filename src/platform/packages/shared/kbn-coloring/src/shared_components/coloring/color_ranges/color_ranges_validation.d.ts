import type { ColorRange, ColorRangeAccessor } from './types';
/** @internal **/
type ColorRangeValidationErrors = 'invalidColor' | 'invalidValue' | 'greaterThanMaxValue' | 'percentOutOfBounds';
/** @internal **/
export interface ColorRangeValidation {
    errors: ColorRangeValidationErrors[];
    isValid: boolean;
}
/** @internal **/
export declare const getErrorMessages: (colorRangesValidity: Record<string, ColorRangeValidation>) => string[];
/** @internal **/
export declare const validateColorRange: (colorRange: ColorRange, accessor: ColorRangeAccessor, isPercent: boolean) => ColorRangeValidation;
export declare const validateColorRanges: (colorRanges: ColorRange[], isPercent: boolean) => Record<string, ColorRangeValidation>;
export declare const allRangesValid: (colorRanges: ColorRange[], isPercent: boolean) => boolean;
export {};
