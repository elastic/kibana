import type { SupportedDataType, FunctionParameterType, FunctionParameter } from '../../types';
import type { Signature } from '../../types';
interface SignatureInput {
    signatures: Signature[];
    paramDefinitions?: FunctionParameter[];
    firstArgumentType?: SupportedDataType | 'unknown';
    firstValueType?: SupportedDataType | 'unknown';
    currentParameterIndex: number;
    hasMoreMandatoryArgs?: boolean;
}
/** Detects when the cursor is on a value param position of a repeating signature such as `CASE`. */
export declare function isAtRepeatingValuePosition(state: SignatureInput): boolean;
/**
 * Detects param positions that can mean two different things.
 *
 * Example: in `CASE(cond1, value1, /)` the third param position could be either a new condition
 * or the final default value, so autocomplete should stay permissive.
 */
export declare function isAmbiguousPosition(state: SignatureInput): boolean;
/** Tells callers whether another argument can still be added. */
export declare function canAcceptMoreArgs(state: SignatureInput): boolean;
/** Checks a candidate expression against the current param position. */
export declare function doesParamAcceptType(state: SignatureInput, expressionType: SupportedDataType | 'unknown', expressionIsLiteral: boolean): boolean;
/**
 * Builds the effective parameter choices for the current param position.
 *
 * Example: for `CASE(cond1, value1, /)` we return both `[boolean, any]` so the caller
 * can suggest either a new condition or a default value.
 */
export declare function getCompatibleParamDefs(state: SignatureInput): FunctionParameter[];
/**
 * Builds the list of types worth suggesting at the current param position.
 *
 * This keeps `CASE` permissive in condition/default param positions while still enforcing result-type
 * homogeneity once the first value branch is known.
 */
export declare function getAcceptedParamTypes(state: SignatureInput): FunctionParameterType[];
/** Checks a type at the current param position using the same rules as autocomplete. */
export declare function isTypeAcceptedAtPosition(state: SignatureInput, expressionType: SupportedDataType | 'unknown', expressionIsLiteral: boolean): boolean;
/** Reads the `mapParams` hint from function signatures. */
export declare function extractSignatureMapParams(signatures: Array<{
    params: Array<{
        mapParams?: string;
    }>;
}>): string | undefined;
export {};
