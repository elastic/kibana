export declare const dataAggregateStepDefinition: import("../../step_registry/types").PublicStepDefinition<import("zod/v4/index.cjs").ZodObject<{
    group_by: import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodString>;
    metrics: import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodObject<{
        name: import("zod/v4/index.cjs").ZodString;
        operation: import("zod/v4/index.cjs").ZodEnum<{
            max: "max";
            min: "min";
            count: "count";
            avg: "avg";
            sum: "sum";
        }>;
        field: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
    }, import("zod/v4/core/schemas.cjs").$strip>>;
    buckets: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodObject<{
        field: import("zod/v4/index.cjs").ZodString;
        ranges: import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodObject<{
            from: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodNumber>;
            to: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodNumber>;
            label: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
        }, import("zod/v4/core/schemas.cjs").$strip>>;
    }, import("zod/v4/core/schemas.cjs").$strip>>;
    order_by: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
    order: import("zod/v4/index.cjs").ZodDefault<import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodEnum<{
        desc: "desc";
        asc: "asc";
    }>>>;
    limit: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodNumber>;
}, import("zod/v4/core/schemas.cjs").$strip>, import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodRecord<import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodUnknown>>, import("zod/v4/index.cjs").ZodObject<{
    items: import("zod/v4/index.cjs").ZodUnknown;
}, import("zod/v4/core/schemas.cjs").$strip>>;
