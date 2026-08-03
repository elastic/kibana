import type { BaseStepDefinition } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
/**
 * Common step definition fields shared between server and public.
 * Extends BaseStepDefinition from @kbn/workflows with the same generic schema triple.
 * Input and output types are automatically inferred from the schemas.
 */
export type CommonStepDefinition<InputSchema extends z.ZodType = z.ZodType, OutputSchema extends z.ZodType = z.ZodType, ConfigSchema extends z.ZodObject = z.ZodObject> = BaseStepDefinition<InputSchema, OutputSchema, ConfigSchema>;
