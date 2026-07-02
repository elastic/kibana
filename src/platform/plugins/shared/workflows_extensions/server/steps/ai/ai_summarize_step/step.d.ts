import type { CoreSetup } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../../types';
export declare const aiSummarizeStepDefinition: (coreSetup: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>) => import("../../../step_registry/types").ServerStepDefinition<import("zod").ZodObject<{
    input: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodUnknown>, import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>]>;
    instructions: import("zod").ZodOptional<import("zod").ZodString>;
    maxLength: import("zod").ZodOptional<import("zod").ZodNumber>;
    temperature: import("zod").ZodOptional<import("zod").ZodNumber>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    content: import("zod").ZodString;
    metadata: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    'connector-id': import("zod").ZodOptional<import("zod").ZodString>;
}, import("zod/v4/core").$strip>>;
