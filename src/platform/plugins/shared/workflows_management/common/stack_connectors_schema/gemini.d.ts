/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/gemini/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import { z } from '@kbn/zod/v4';
export declare const GeminiParamsSchema: z.ZodObject<{
    body: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const GeminiResponseSchema: z.ZodObject<{
    candidates: z.ZodArray<z.ZodObject<{
        content: z.ZodObject<{
            parts: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
            }, z.core.$strip>>;
            role: z.ZodString;
        }, z.core.$strip>;
        finishReason: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    usageMetadata: z.ZodOptional<z.ZodObject<{
        promptTokenCount: z.ZodNumber;
        candidatesTokenCount: z.ZodNumber;
        totalTokenCount: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
