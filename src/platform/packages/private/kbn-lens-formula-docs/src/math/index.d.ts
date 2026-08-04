declare const FORMULA_ARG_TYPES: readonly ["number", "boolean", "string"];
export type FormulaArgType = (typeof FORMULA_ARG_TYPES)[number];
export declare const isFormulaArgType: (value: string) => value is FormulaArgType;
/**
 * Returns a locale-aware display label for an internal type constant.
 * Use this only for display in UI text, tooltips, and error messages.
 * Never use the return value for identity comparisons.
 */
export declare const getTypeLabel: (type: FormulaArgType) => string;
export declare const tinymathFunctions: Record<string, {
    section: 'math' | 'comparison';
    positionalArguments: Array<{
        name: string;
        optional?: boolean;
        defaultValue?: string | number;
        /** Locale-invariant type constant. Use getTypeLabel() to get the translated display label. */
        type?: FormulaArgType;
        alternativeWhenMissing?: string;
    }>;
    help: string;
    /** Locale-invariant type constant. Use getTypeLabel() to get the translated display label. */
    outputType?: FormulaArgType;
}>;
export {};
