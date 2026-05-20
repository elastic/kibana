/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/common/inference/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const InferenceUnifiedCompletionParamsSchema: z.ZodObject<{
    body: z.ZodObject<{
        messages: z.ZodDefault<z.ZodArray<z.ZodObject<{
            role: z.ZodString;
            content: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            name: z.ZodOptional<z.ZodString>;
            tool_calls: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                function: z.ZodObject<{
                    arguments: z.ZodOptional<z.ZodString>;
                    name: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>;
                type: z.ZodString;
            }, z.core.$strip>>>;
            tool_call_id: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        model: z.ZodOptional<z.ZodString>;
        max_tokens: z.ZodOptional<z.ZodNumber>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        n: z.ZodOptional<z.ZodNumber>;
        stop: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>>;
        temperature: z.ZodOptional<z.ZodNumber>;
        tool_choice: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
            type: z.ZodString;
            function: z.ZodObject<{
                name: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>]>>;
        tools: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodString;
            function: z.ZodObject<{
                name: z.ZodString;
                description: z.ZodOptional<z.ZodString>;
                parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, z.core.$strip>;
        }, z.core.$strip>>>;
        top_p: z.ZodOptional<z.ZodNumber>;
        user: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    signal: z.ZodOptional<z.ZodAny>;
    telemetryMetadata: z.ZodOptional<z.ZodObject<{
        pluginId: z.ZodOptional<z.ZodString>;
        aggregateBy: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const InferenceCompletionParamsSchema: z.ZodObject<{
    input: z.ZodString;
}, z.core.$strip>;
export declare const InferenceRerankParamsSchema: z.ZodObject<{
    input: z.ZodDefault<z.ZodArray<z.ZodString>>;
    query: z.ZodString;
}, z.core.$strip>;
export declare const InferenceTextEmbeddingParamsSchema: z.ZodObject<{
    input: z.ZodString;
    inputType: z.ZodString;
}, z.core.$strip>;
export declare const InferenceSparseEmbeddingParamsSchema: z.ZodObject<{
    input: z.ZodString;
}, z.core.$strip>;
export declare const InferenceUnifiedCompletionResponseSchema: z.ZodObject<{
    id: z.ZodString;
    choices: z.ZodDefault<z.ZodArray<z.ZodObject<{
        finish_reason: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
            stop: "stop";
            length: "length";
            tool_calls: "tool_calls";
            content_filter: "content_filter";
            function_call: "function_call";
        }>>>;
        index: z.ZodOptional<z.ZodNumber>;
        message: z.ZodObject<{
            content: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            refusal: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            role: z.ZodOptional<z.ZodString>;
            tool_calls: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodOptional<z.ZodString>;
                index: z.ZodOptional<z.ZodNumber>;
                function: z.ZodOptional<z.ZodObject<{
                    arguments: z.ZodOptional<z.ZodString>;
                    name: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                type: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>>;
        }, z.core.$strip>;
    }, z.core.$strip>>>;
    created: z.ZodOptional<z.ZodNumber>;
    model: z.ZodOptional<z.ZodString>;
    object: z.ZodOptional<z.ZodString>;
    usage: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        completion_tokens: z.ZodOptional<z.ZodNumber>;
        prompt_tokens: z.ZodOptional<z.ZodNumber>;
        total_tokens: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const InferenceCompletionResponseSchema: z.ZodDefault<z.ZodArray<z.ZodObject<{
    result: z.ZodString;
}, z.core.$strip>>>;
export declare const InferenceRerankResponseSchema: z.ZodDefault<z.ZodArray<z.ZodObject<{
    text: z.ZodOptional<z.ZodString>;
    index: z.ZodNumber;
    score: z.ZodNumber;
}, z.core.$strip>>>;
export declare const InferenceTextEmbeddingResponseSchema: z.ZodDefault<z.ZodArray<z.ZodObject<{
    embedding: z.ZodDefault<z.ZodArray<z.ZodAny>>;
}, z.core.$strip>>>;
export declare const InferenceSparseEmbeddingResponseSchema: z.ZodDefault<z.ZodArray<z.ZodObject<{}, z.core.$loose>>>;
