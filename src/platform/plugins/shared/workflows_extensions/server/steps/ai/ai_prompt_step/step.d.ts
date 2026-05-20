import type { CoreSetup } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../../types';
export declare const aiPromptStepDefinition: (coreSetup: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>) => import("../../../step_registry/types").ServerStepDefinition<import("zod").ZodObject<{
    prompt: import("zod").ZodString;
    systemPrompt: import("zod").ZodOptional<import("zod").ZodString>;
    schema: import("zod").ZodOptional<import("zod").ZodType<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>;
    temperature: import("zod").ZodOptional<import("zod").ZodNumber>;
}, import("zod/v4/core").$strip>, import("zod").ZodUnion<readonly [import("zod").ZodObject<{
    content: import("zod").ZodString;
    metadata: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    content: import("zod").ZodType<unknown, unknown, import("zod/v4/core").$ZodTypeInternals<unknown, unknown>>;
    metadata: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>;
}, import("zod/v4/core").$strip>]>, import("zod").ZodObject<{
    'connector-id': import("zod").ZodOptional<import("zod").ZodString>;
}, import("zod/v4/core").$strip>>;
