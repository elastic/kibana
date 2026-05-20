/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/common/openai/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const GenAIRunParamsSchema: z.ZodObject<{
    body: z.ZodString;
    timeout: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const GenAIInvokeAIParamsSchema: z.ZodObject<{
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodString;
        content: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        function_call: z.ZodOptional<z.ZodObject<{
            arguments: z.ZodString;
            name: z.ZodString;
        }, z.core.$strip>>;
        tool_calls: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            function: z.ZodObject<{
                arguments: z.ZodString;
                name: z.ZodString;
            }, z.core.$strip>;
            type: z.ZodString;
        }, z.core.$strip>>>;
        tool_call_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    model: z.ZodOptional<z.ZodString>;
    tools: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodLiteral<"function">;
        function: z.ZodObject<{
            description: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
            strict: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>;
    }, z.core.$strip>>>;
    tool_choice: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"none">, z.ZodLiteral<"auto">, z.ZodLiteral<"required">, z.ZodObject<{
        type: z.ZodLiteral<"function">;
        function: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>]>>;
    functions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        parameters: z.ZodObject<{
            type: z.ZodString;
            properties: z.ZodRecord<z.ZodString, z.ZodAny>;
            additionalProperties: z.ZodBoolean;
        }, z.core.$strip>;
    }, z.core.$strip>>>;
    function_call: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"none">, z.ZodLiteral<"auto">, z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>]>>;
    n: z.ZodOptional<z.ZodNumber>;
    stop: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>>;
    temperature: z.ZodOptional<z.ZodNumber>;
    response_format: z.ZodOptional<z.ZodAny>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const GenAIStreamParamsSchema: z.ZodObject<{
    body: z.ZodString;
    stream: z.ZodDefault<z.ZodBoolean>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const GenAIDashboardParamsSchema: z.ZodObject<{
    dashboardId: z.ZodString;
}, z.core.$strip>;
export declare const GenAITestParamsSchema: z.ZodObject<{
    timeout: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const GenAIRunResponseSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    object: z.ZodOptional<z.ZodString>;
    created: z.ZodOptional<z.ZodNumber>;
    model: z.ZodOptional<z.ZodString>;
    usage: z.ZodObject<{
        prompt_tokens: z.ZodNumber;
        completion_tokens: z.ZodNumber;
        total_tokens: z.ZodNumber;
    }, z.core.$strip>;
    choices: z.ZodArray<z.ZodObject<{
        message: z.ZodObject<{
            role: z.ZodString;
            content: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>;
        finish_reason: z.ZodOptional<z.ZodString>;
        index: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const GenAIInvokeAIResponseSchema: z.ZodObject<{
    message: z.ZodString;
    usage: z.ZodObject<{
        prompt_tokens: z.ZodNumber;
        completion_tokens: z.ZodNumber;
        total_tokens: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const GenAIStreamResponseSchema: z.ZodAny;
export declare const GenAIDashboardResponseSchema: z.ZodObject<{
    available: z.ZodBoolean;
}, z.core.$strip>;
export declare const GenAITestResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, z.core.$strip>;
