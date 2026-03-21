export declare const dataDedupeStepDefinition: import("../../step_registry/types").ServerStepDefinition<import("zod/v4/index.cjs").ZodObject<{
    keys: import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodString>;
}, import("zod/v4/core/schemas.cjs").$strip>, import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodUnknown>, import("zod/v4/index.cjs").ZodObject<{
    items: import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodUnknown>;
    strategy: import("zod/v4/index.cjs").ZodDefault<import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodEnum<{
        keep_first: "keep_first";
        keep_last: "keep_last";
    }>>>;
}, import("zod/v4/core/schemas.cjs").$strip>>;
