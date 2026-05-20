import type { EndValue, FittingFunction } from '../../common';
export declare function getFitEnum(fittingFunction?: FittingFunction | EndValue): "none" | "average" | "zero" | "linear" | "nearest" | "carry" | "lookahead";
export declare function getEndValue(endValue?: EndValue): 0 | "nearest" | undefined;
export declare function getFitOptions(fittingFunction?: FittingFunction, endValue?: EndValue): {
    type: "none" | "average" | "zero" | "linear" | "nearest" | "carry" | "lookahead";
    endValue: number | "nearest" | undefined;
};
