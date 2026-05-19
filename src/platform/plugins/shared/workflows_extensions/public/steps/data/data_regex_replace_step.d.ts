export declare const dataRegexReplaceStepDefinition: import("../../step_registry/types").PublicStepDefinition<import("zod").ZodObject<{
    pattern: import("zod").ZodString;
    replacement: import("zod").ZodString;
    flags: import("zod").ZodOptional<import("zod").ZodString>;
}, import("zod/v4/core").$strip>, import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>, import("zod").ZodObject<{
    original: import("zod").ZodUnknown;
    replaced: import("zod").ZodUnknown;
    matchCount: import("zod").ZodNumber;
}, import("zod/v4/core").$strip>]>, import("zod").ZodObject<{
    source: import("zod").ZodUnknown;
    detailed: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodBoolean>>;
}, import("zod/v4/core").$strip>>;
