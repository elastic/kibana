import { type FieldsNode } from '../../../common/steps/data';
export declare const dataMapStepDefinition: import("../../step_registry/types").ServerStepDefinition<import("zod/v4/index.cjs").ZodObject<{
    fields: import("zod/v4/index.cjs").ZodRecord<import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodType<FieldsNode, unknown, import("zod/v4/core/schemas.cjs").$ZodTypeInternals<FieldsNode, unknown>>>;
}, import("zod/v4/core/schemas.cjs").$strip>, import("zod/v4/index.cjs").ZodUnion<readonly [import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodRecord<import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodUnknown>>, import("zod/v4/index.cjs").ZodRecord<import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodUnknown>]>, import("zod/v4/index.cjs").ZodObject<{
    items: import("zod/v4/index.cjs").ZodUnknown;
}, import("zod/v4/core/schemas.cjs").$strip>>;
