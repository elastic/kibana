import type { SupportedDataType, FunctionParameterType, Signature } from '../../types';
export declare const PARAM_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING: FunctionParameterType[];
/** Checks whether one argument type can be used for one parameter type. */
export declare function argMatchesParamType(givenType: SupportedDataType | 'unknown', expectedType: FunctionParameterType, givenIsLiteral: boolean, acceptUnknown: boolean): boolean;
/**
 * Keeps only the signatures that match the arguments typed so far.
 *
 * Example: for `CASE(cond1, value1, cond2, value2, default)`, this handles
 * condition param positions, value param positions, and the final default param position.
 */
export declare function getMatchingSignatures(signatures: Signature[], givenTypes: Array<SupportedDataType | 'unknown'>, literalMask: boolean[], acceptUnknown: boolean, acceptPartialMatches?: boolean): Signature[];
/** Keeps `text` and `keyword` together in suggestions, even if only one appears in the signatures. */
export declare function pairKeywordAndTextTypes(types: FunctionParameterType[]): FunctionParameterType[];
