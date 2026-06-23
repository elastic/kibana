import type { LicenseType } from '@kbn/licensing-types';
import type { ESQLControlVariable, RecommendedField } from '@kbn/esql-types';
import type { ESQLVariableType } from '@kbn/esql-types';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import { type FunctionDefinition, type FunctionFilterPredicates, type FunctionParameterType, type InlineCastingType } from '../types';
import type { ESQLColumnData, ISuggestionItem } from '../../registry/types';
export declare function buildFunctionLookup(): Map<string, FunctionDefinition>;
export declare const buildFieldsDefinitions: (fields: string[], openSuggestions?: boolean) => ISuggestionItem[];
export declare function getFunctionDefinition(name: string): FunctionDefinition | undefined;
export declare const filterFunctionSignatures: (signatures: FunctionDefinition["signatures"], hasMinimumLicenseRequired: ((minimumLicenseRequired: LicenseType) => boolean) | undefined) => FunctionDefinition["signatures"];
export declare const filterFunctionDefinitions: (functions: FunctionDefinition[], predicates: FunctionFilterPredicates | undefined, hasMinimumLicenseRequired: ((minimumLicenseRequired: LicenseType) => boolean) | undefined, activeProduct?: PricingProduct | undefined) => FunctionDefinition[];
export declare function getAllFunctions(options?: {
    type?: Array<FunctionDefinition['type']> | FunctionDefinition['type'];
    includeOperators?: boolean;
}): FunctionDefinition[];
export declare function printArguments({ name, type, optional, }: {
    name: string;
    type: FunctionParameterType | FunctionParameterType[];
    optional?: boolean;
}, withTypes: boolean): string;
/**
 * Given a function definition, this function will return a list of function signatures
 *
 * If withTypes is true, the function will return a formal function definition with all arguments typed.
 * This is used when generating the function signature for the monaco editor. If withTypes is false, you get
 * an "injectable" version of the signature to be used to generate test cases.
 */
export declare function getFunctionSignatures({ name, signatures }: FunctionDefinition, { withTypes, capitalize }?: {
    withTypes: boolean;
    capitalize?: boolean;
}): {
    declaration: string;
}[];
export declare function getFunctionSuggestion(fn: FunctionDefinition): ISuggestionItem;
export declare const buildColumnSuggestions: (columns: ESQLColumnData[], recommendedFieldsFromExtensions?: RecommendedField[], options?: {
    advanceCursor?: boolean;
    openSuggestions?: boolean;
    addComma?: boolean;
    variableType?: ESQLVariableType;
    supportsControls?: boolean;
    supportsMultiValue?: boolean;
    isFieldsBrowserEnabled?: boolean;
}, variables?: ESQLControlVariable[]) => ISuggestionItem[];
/**
 * Given an inline cast data type, return the corresponding function that performs the cast.
 * E.g., for 'integer' or 'int', it returns 'to_integer'.
 *
 * It returns undefined if the inline cast data type is not supported.
 */
export declare function getFunctionForInlineCast(castingType: InlineCastingType): string | undefined;
export declare function isTypeConversionFunction(functionName: string): boolean;
