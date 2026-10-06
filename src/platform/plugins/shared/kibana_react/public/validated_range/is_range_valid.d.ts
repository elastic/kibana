import type { ValueMember, Value } from './validated_dual_range';
export declare function isRangeValid(value?: Value, min?: ValueMember, max?: ValueMember, allowEmptyRange?: boolean): {
    isValid: boolean;
    errorMessage: string;
};
