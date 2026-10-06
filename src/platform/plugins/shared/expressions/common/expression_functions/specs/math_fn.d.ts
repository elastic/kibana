import type { MathArguments, MathInput } from './math';
export declare const errors: {
    emptyExpression: () => Error;
    tooManyResults: () => Error;
    executionFailed: () => Error;
    emptyDatatable: () => Error;
};
export declare const mathFn: (input: MathInput, args: MathArguments) => boolean | number | null;
