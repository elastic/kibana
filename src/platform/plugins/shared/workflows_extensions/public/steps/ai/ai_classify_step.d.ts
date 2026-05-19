export declare const AiClassifyStepDefinition: import("../../step_registry/types").PublicStepDefinition<import("zod").ZodObject<{
    input: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodUnknown>, import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>]>;
    categories: import("zod").ZodArray<import("zod").ZodString>;
    instructions: import("zod").ZodOptional<import("zod").ZodString>;
    allowMultipleCategories: import("zod").ZodOptional<import("zod").ZodBoolean>;
    fallbackCategory: import("zod").ZodOptional<import("zod").ZodString>;
    includeRationale: import("zod").ZodOptional<import("zod").ZodBoolean>;
    temperature: import("zod").ZodOptional<import("zod").ZodNumber>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    category: import("zod").ZodOptional<import("zod").ZodString>;
    categories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    rationale: import("zod").ZodOptional<import("zod").ZodString>;
    metadata: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    'connector-id': import("zod").ZodOptional<import("zod").ZodString>;
}, import("zod/v4/core").$strip>>;
