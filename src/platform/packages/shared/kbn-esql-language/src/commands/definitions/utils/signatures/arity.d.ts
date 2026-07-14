import type { FunctionDefinition, FunctionParameter, Signature } from '../../types';
/** Finds which parameter a given argument position belongs to. */
export declare function getParamAtPosition(signature: Signature, position: number, options?: {
    repeat?: boolean;
}): FunctionParameter | null;
/** Collects the parameter shapes allowed at one argument position across many signatures. */
export declare function getParamDefsAtPosition(signatures: Signature[], argIndex: number): FunctionParameter[];
/** Computes the smallest and largest valid arity for a group of signatures. */
export declare function getMaxMinNumberOfParams(signatures: Signature[]): {
    min: number;
    max: number;
};
/** Checks whether one signature accepts the current number of arguments. */
export declare function matchesArity(signature: FunctionDefinition['signatures'][number], arity: number): boolean;
