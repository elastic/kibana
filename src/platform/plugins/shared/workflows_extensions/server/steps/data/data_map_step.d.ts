import { type FieldsNode } from '../../../common/steps/data';
export declare const dataMapStepDefinition: import("../../step_registry/types").ServerStepDefinition<import("zod").ZodObject<{
    fields: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodType<FieldsNode, unknown, import("zod/v4/core").$ZodTypeInternals<FieldsNode, unknown>>>;
}, import("zod/v4/core").$strip>, import("zod").ZodUnion<readonly [import("zod").ZodArray<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>, import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>]>, import("zod").ZodObject<{
    items: import("zod").ZodUnknown;
}, import("zod/v4/core").$strip>>;
