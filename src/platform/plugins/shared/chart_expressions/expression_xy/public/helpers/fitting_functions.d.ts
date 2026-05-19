import type { EndValue, FittingFunction } from '../../common';
export declare function getFitEnum(fittingFunction?: FittingFunction | EndValue): "none" | "linear" | "average" | "nearest" | "zero" | "carry" | "lookahead";
export declare function getEndValue(endValue?: EndValue): 0 | "nearest" | undefined;
export declare function getFitOptions(fittingFunction?: FittingFunction, endValue?: EndValue): {
    type: "none" | "linear" | "average" | "nearest" | "zero" | "carry" | "lookahead";
    endValue: number | "nearest" | undefined;
};
