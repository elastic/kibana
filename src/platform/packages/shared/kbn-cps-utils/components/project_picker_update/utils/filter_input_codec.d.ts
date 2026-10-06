import { z } from '@kbn/zod';
export declare const FilterOperator: {
    readonly EQUALS: 'is';
    readonly NOT_EQUALS: 'not';
    readonly ONE_OF: 'oneOf';
    readonly NOT_ONE_OF: 'notOneOf';
    readonly EXISTS: 'exists';
    readonly NOT_EXISTS: 'notExists';
};
export declare const OperatorKind: {
    readonly EQUALS: 'equals';
    readonly ONE_OF: 'oneOf';
    readonly EXISTS: 'exists';
};
export type FilterOperatorLiteral = (typeof FilterOperator)[keyof typeof FilterOperator];
export type OperatorKindLiteral = (typeof OperatorKind)[keyof typeof OperatorKind];
declare const OPERATOR_INVERSION: {
    readonly is: "not";
    readonly not: "is";
    readonly oneOf: "notOneOf";
    readonly notOneOf: "oneOf";
    readonly exists: "notExists";
    readonly notExists: "exists";
};
/** Returns the polarity-flipped counterpart of `operator`, preserving its value kind. */
export declare function invertOperator<Op extends FilterOperatorLiteral>(operator: Op): (typeof OPERATOR_INVERSION)[Op];
export declare function getOperatorKind(operator: FilterOperatorLiteral): OperatorKindLiteral;
export declare function isNegatedOperator(operator: FilterOperatorLiteral | undefined): boolean;
export declare const FilterExpressionSchema: z.ZodUnion<readonly [z.ZodObject<{
    tagName: z.ZodString;
    operator: z.ZodEnum<{
        is: "is";
        not: "not";
    }>;
    tagValue: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    tagName: z.ZodString;
    operator: z.ZodEnum<{
        notOneOf: "notOneOf";
        oneOf: "oneOf";
    }>;
    tagValue: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    tagName: z.ZodString;
    operator: z.ZodEnum<{
        exists: "exists";
        notExists: "notExists";
    }>;
    tagValue: z.ZodUndefined;
}, z.core.$strip>]>;
export type FilterExpressionValue = z.output<typeof FilterExpressionSchema>;
/**
 * The not-yet-fully-specified state of a filter expression, e.g. while it's still being drafted
 * in the filter form. Every field is optional since the user may not have made a selection yet.
 */
export interface FilterExpressionDraft {
    operator?: FilterOperatorLiteral;
    tagName?: string;
    tagValue?: string | string[];
}
/**
 * Narrows a draft down to a complete, well-formed `FilterExpressionValue` — verifying not just
 * that each field is present, but that `tagValue`'s runtime shape (string vs. list vs. absent)
 * actually matches what the operator's kind requires.
 */
export declare function isValidFilterExpression(draft: FilterExpressionDraft): draft is FilterExpressionValue;
/**
 * filter expression codec declaration for CPS project picker filtering,
 * leverages zod for validation and transforms.
 */
export declare const filterExpressionCodec: z.ZodCodec<z.ZodOptional<z.ZodString>, z.ZodUnion<readonly [z.ZodObject<{
    tagName: z.ZodString;
    operator: z.ZodEnum<{
        is: "is";
        not: "not";
    }>;
    tagValue: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    tagName: z.ZodString;
    operator: z.ZodEnum<{
        notOneOf: "notOneOf";
        oneOf: "oneOf";
    }>;
    tagValue: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    tagName: z.ZodString;
    operator: z.ZodEnum<{
        exists: "exists";
        notExists: "notExists";
    }>;
    tagValue: z.ZodUndefined;
}, z.core.$strip>]>>;
export type FilterExpressionCodecInput = z.input<typeof FilterExpressionSchema>;
export type FilterExpressionCodecOutput = z.output<typeof FilterExpressionSchema>;
/** Canonical Map key for a stored filter expression (matches encoded badge text semantics). */
export declare function getFilterExpressionLookupKey(expression: FilterExpressionValue): string;
export {};
