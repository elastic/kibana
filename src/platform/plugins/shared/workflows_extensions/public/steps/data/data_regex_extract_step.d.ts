export declare const dataRegexExtractStepDefinition: import("../../step_registry/types").PublicStepDefinition<import("zod/v4/index.cjs").ZodObject<{
    pattern: import("zod/v4/index.cjs").ZodString;
    fields: import("zod/v4/index.cjs").ZodRecord<import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodString>;
    flags: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
}, import("zod/v4/core/schemas.cjs").$strip>, import("zod/v4/index.cjs").ZodUnion<readonly [import("zod/v4/index.cjs").ZodRecord<import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodUnknown>, import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodUnion<readonly [import("zod/v4/index.cjs").ZodRecord<import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodUnknown>, import("zod/v4/index.cjs").ZodNull]>>, import("zod/v4/index.cjs").ZodNull]>, import("zod/v4/index.cjs").ZodObject<{
    source: import("zod/v4/index.cjs").ZodUnknown;
    errorIfNoMatch: import("zod/v4/index.cjs").ZodDefault<import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodBoolean>>;
}, import("zod/v4/core/schemas.cjs").$strip>>;
