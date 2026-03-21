export declare const dataRegexReplaceStepDefinition: import("../../step_registry/types").ServerStepDefinition<import("zod/v4/index.cjs").ZodObject<{
    pattern: import("zod/v4/index.cjs").ZodString;
    replacement: import("zod/v4/index.cjs").ZodString;
    flags: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
}, import("zod/v4/core/schemas.cjs").$strip>, import("zod/v4/index.cjs").ZodUnion<readonly [import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodString>, import("zod/v4/index.cjs").ZodObject<{
    original: import("zod/v4/index.cjs").ZodUnknown;
    replaced: import("zod/v4/index.cjs").ZodUnknown;
    matchCount: import("zod/v4/index.cjs").ZodNumber;
}, import("zod/v4/core/schemas.cjs").$strip>]>, import("zod/v4/index.cjs").ZodObject<{
    source: import("zod/v4/index.cjs").ZodUnknown;
    detailed: import("zod/v4/index.cjs").ZodDefault<import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodBoolean>>;
}, import("zod/v4/core/schemas.cjs").$strip>>;
