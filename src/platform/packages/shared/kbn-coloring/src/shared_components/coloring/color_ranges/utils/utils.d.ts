import type { PaletteContinuity, DataBounds, CustomPaletteParams } from '../../../../palettes';
import type { ColorRange, ColorRangeAccessor } from '../types';
/**
 * Check if item is last
 * @internal
 */
export declare const isLastItem: (accessor: ColorRangeAccessor) => accessor is "end";
/**
 * Sort Color ranges array
 * @internal
 */
export declare const sortColorRanges: (colorRanges: ColorRange[]) => ColorRange[];
/**
 * Calculate max step
 * @internal
 */
export declare const calculateMaxStep: (stops: number[], max: number) => number;
/**
 * Convert ColorRange to ColorStops
 * @internal
 */
export declare const toColorStops: (colorRanges: ColorRange[], continuity: PaletteContinuity) => {
    min: number;
    max: number;
    colorStops: {
        color: string;
        stop: number;
    }[];
};
/**
 * Calculate right max or min value for new continuity
 */
export declare const getValueForContinuity: (colorRanges: ColorRange[], continuity: PaletteContinuity, isUpper: boolean, rangeType: CustomPaletteParams["rangeType"], dataBounds: DataBounds) => number;
/**
 * Returns information about an automatic bound (the top and bottom boundaries of the palette range)
 */
export declare const getAutoBoundInformation: ({ isPercentage, isUpper, isAuto, }: {
    isPercentage: boolean;
    isUpper: boolean;
    isAuto: boolean;
}) => {
    representation: string;
    actionDescription: string;
    icon: (props: Omit<import("@elastic/eui/src/components/icon/icon").EuiIconProps, "type">) => import("react").JSX.Element;
};
