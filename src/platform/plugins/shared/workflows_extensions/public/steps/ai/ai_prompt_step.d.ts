export declare const AiPromptStepDefinition: import("../../step_registry/types").PublicStepDefinition<import("zod/v4/index.cjs").ZodObject<{
    prompt: import("zod/v4/index.cjs").ZodString;
    systemPrompt: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
    schema: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodType<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown, import("zod/v4/core/schemas.cjs").$ZodTypeInternals<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>;
    temperature: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodNumber>;
}, import("zod/v4/core/schemas.cjs").$strip>, import("zod/v4/index.cjs").ZodUnion<readonly [import("zod/v4/index.cjs").ZodObject<{
    content: import("zod/v4/index.cjs").ZodString;
    metadata: import("zod/v4/index.cjs").ZodRecord<import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodAny>;
}, import("zod/v4/core/schemas.cjs").$strip>, import("zod/v4/index.cjs").ZodObject<{
    content: import("zod/v4/index.cjs").ZodType<unknown, unknown, import("zod/v4/core/schemas.cjs").$ZodTypeInternals<unknown, unknown>>;
    metadata: import("zod/v4/index.cjs").ZodRecord<import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodAny>;
}, import("zod/v4/core/schemas.cjs").$strip>]>, import("zod/v4/index.cjs").ZodObject<{
    'connector-id': import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
}, import("zod/v4/core/schemas.cjs").$strip>>;
