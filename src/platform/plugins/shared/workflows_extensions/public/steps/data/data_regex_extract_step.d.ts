export declare const dataRegexExtractStepDefinition: import("../../step_registry/types").PublicStepDefinition<import("zod").ZodObject<{
    pattern: import("zod").ZodString;
    fields: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodString>;
    flags: import("zod").ZodOptional<import("zod").ZodString>;
}, import("zod/v4/core").$strip>, import("zod").ZodUnion<readonly [import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>, import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>, import("zod").ZodNull]>>, import("zod").ZodNull]>, import("zod").ZodObject<{
    source: import("zod").ZodUnknown;
    errorIfNoMatch: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodBoolean>>;
}, import("zod/v4/core").$strip>>;
