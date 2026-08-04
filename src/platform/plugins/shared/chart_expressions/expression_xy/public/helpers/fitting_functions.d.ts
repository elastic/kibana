import type { EndValue, FittingFunction } from '../../common';
export declare function getFitEnum(fittingFunction?: FittingFunction | EndValue): "none" | "average" | "linear" | "carry" | "lookahead" | "nearest" | "zero";
export declare function getEndValue(endValue?: EndValue): 0 | "nearest" | undefined;
export declare function getFitOptions(fittingFunction?: FittingFunction, endValue?: EndValue): {
    type: "none" | "average" | "linear" | "carry" | "lookahead" | "nearest" | "zero";
    endValue: number | "nearest" | undefined;
};
