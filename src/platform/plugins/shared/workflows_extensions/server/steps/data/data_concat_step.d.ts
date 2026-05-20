export declare const MAX_CONCAT_ITEMS = 100000;
export declare const dataConcatStepDefinition: import("../../step_registry/types").ServerStepDefinition<import("zod").ZodObject<{
    dedupe: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodBoolean>>;
    flatten: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodBoolean, import("zod").ZodNumber]>>>;
}, import("zod/v4/core").$strip>, import("zod").ZodArray<import("zod").ZodUnknown>, import("zod").ZodObject<{
    arrays: import("zod").ZodArray<import("zod").ZodUnknown>;
}, import("zod/v4/core").$strip>>;
