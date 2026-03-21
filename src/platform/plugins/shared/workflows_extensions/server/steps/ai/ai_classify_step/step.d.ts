import type { CoreSetup } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../../types';
export declare const aiClassifyStepDefinition: (coreSetup: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>) => import("../../../step_registry/types").ServerStepDefinition<import("zod/v4/index.cjs").ZodObject<{
    input: import("zod/v4/index.cjs").ZodUnion<readonly [import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodUnknown>, import("zod/v4/index.cjs").ZodRecord<import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodUnknown>]>;
    categories: import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodString>;
    instructions: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
    allowMultipleCategories: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodBoolean>;
    fallbackCategory: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
    includeRationale: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodBoolean>;
    temperature: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodNumber>;
}, import("zod/v4/core/schemas.cjs").$strip>, import("zod/v4/index.cjs").ZodObject<{
    category: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
    categories: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodString>>;
    rationale: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
    metadata: import("zod/v4/index.cjs").ZodRecord<import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodAny>;
}, import("zod/v4/core/schemas.cjs").$strip>, import("zod/v4/index.cjs").ZodObject<{
    'connector-id': import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
}, import("zod/v4/core/schemas.cjs").$strip>>;
