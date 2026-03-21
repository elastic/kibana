/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/openai/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import { z } from '@kbn/zod/v4';
export declare const OpenAIParamsSchema: z.ZodObject<{
    body: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
    n: z.ZodOptional<z.ZodNumber>;
    stop: z.ZodOptional<z.ZodArray<z.ZodString>>;
    temperature: z.ZodOptional<z.ZodNumber>;
    max_tokens: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const OpenAIResponseSchema: z.ZodObject<{
    choices: z.ZodArray<z.ZodObject<{
        message: z.ZodObject<{
            role: z.ZodString;
            content: z.ZodString;
        }, z.core.$strip>;
        finish_reason: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    usage: z.ZodOptional<z.ZodObject<{
        prompt_tokens: z.ZodNumber;
        completion_tokens: z.ZodNumber;
        total_tokens: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
