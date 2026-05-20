export declare const dataAggregateStepDefinition: import("../../step_registry/types").ServerStepDefinition<import("zod").ZodObject<{
    group_by: import("zod").ZodArray<import("zod").ZodString>;
    metrics: import("zod").ZodArray<import("zod").ZodObject<{
        name: import("zod").ZodString;
        operation: import("zod").ZodEnum<{
            min: "min";
            max: "max";
            count: "count";
            sum: "sum";
            avg: "avg";
        }>;
        field: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>>;
    buckets: import("zod").ZodOptional<import("zod").ZodObject<{
        field: import("zod").ZodString;
        ranges: import("zod").ZodArray<import("zod").ZodObject<{
            from: import("zod").ZodOptional<import("zod").ZodNumber>;
            to: import("zod").ZodOptional<import("zod").ZodNumber>;
            label: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>>;
    order_by: import("zod").ZodOptional<import("zod").ZodString>;
    order: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEnum<{
        desc: "desc";
        asc: "asc";
    }>>>;
    limit: import("zod").ZodOptional<import("zod").ZodNumber>;
}, import("zod/v4/core").$strip>, import("zod").ZodArray<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>, import("zod").ZodObject<{
    items: import("zod").ZodUnknown;
}, import("zod/v4/core").$strip>>;
