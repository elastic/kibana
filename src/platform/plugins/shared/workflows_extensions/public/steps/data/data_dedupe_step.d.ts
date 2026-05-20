export declare const dataDedupeStepDefinition: import("../../step_registry/types").PublicStepDefinition<import("zod").ZodObject<{
    keys: import("zod").ZodArray<import("zod").ZodString>;
}, import("zod/v4/core").$strip>, import("zod").ZodArray<import("zod").ZodUnknown>, import("zod").ZodObject<{
    items: import("zod").ZodArray<import("zod").ZodUnknown>;
    strategy: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<{
        keep_first: "keep_first";
        keep_last: "keep_last";
    }>>>;
}, import("zod/v4/core").$strip>>;
