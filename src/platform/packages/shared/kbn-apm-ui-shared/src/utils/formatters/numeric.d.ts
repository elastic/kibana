import type { Maybe } from '@kbn/apm-types-shared';
export declare const NOT_AVAILABLE_LABEL: string;
export declare function asDecimal(value: Maybe<number> | null): string;
export declare function asInteger(value: Maybe<number> | null): string;
export declare function asDecimalOrInteger(value: Maybe<number>, threshold?: number): string;
export declare function asPercent(numerator: Maybe<number>, denominator: number | undefined, fallbackResult?: string): string;
