import type { ISuggestionItem } from '../../../../registry/types';
import type { FunctionParameterType, FunctionDefinitionTypes } from '../../../types';
import type { ExpressionContext } from './types';
import type { PreferredExpressionType } from './types';
import { type CommaContext } from './comma_decision_engine';
/** Builder pattern to eliminate duplicated field/function/literal suggestion code. */
export declare class SuggestionBuilder {
    private suggestions;
    private readonly context;
    constructor(context: ExpressionContext);
    addFields(options?: {
        types?: FunctionParameterType[];
        ignoredColumns?: string[];
        addComma?: boolean;
        addSpaceAfterField?: boolean;
        openSuggestions?: boolean;
        values?: boolean;
        canBeMultiValue?: boolean;
    }): Promise<this>;
    addFunctions(options?: {
        types?: FunctionParameterType[];
        addComma?: boolean;
        addSpaceAfterFunction?: boolean;
        constantGeneratingOnly?: boolean;
        excludeParentFunctions?: boolean;
        functionTypes?: FunctionDefinitionTypes[];
    }): this;
    addLiterals(options?: {
        types?: FunctionParameterType[];
        addComma?: boolean;
        includeDateLiterals?: boolean;
        includeCompatibleLiterals?: boolean;
        advanceCursorAndOpenSuggestions?: boolean;
    }): this;
    addOperators(options?: {
        leftParamType?: FunctionParameterType;
        allowed?: string[];
        ignored?: string[];
        returnTypes?: PreferredExpressionType[];
    }): this;
    /**
     * Adds comma suggestion based on decision engine rules.
     */
    addCommaIfNeeded(commaContext: CommaContext): this;
    addSuggestions(suggestions: ISuggestionItem[]): this;
    build(): ISuggestionItem[];
    /**
     * Returns functions to exclude from suggestions by merging two sources:
     * 1. Command-level ignored functions (e.g., EVAL hides match_phrase)
     *    - Applies exceptions: if current parent function is in allowedInsideFunctions, the function is not ignored
     * 2. Parent function names for recursion prevention (e.g., ABS inside ABS)
     *    - Only included when excludeParentFunctions=true
     */
    private resolveIgnoredFunctions;
}
