import { z } from '@kbn/zod/v4';
import { OpenAiProviderType } from '../constants';
export declare const TelemetryMetadataSchema: z.ZodObject<{
    pluginId: z.ZodOptional<z.ZodString>;
    aggregateBy: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const ConfigSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    apiProvider: z.ZodEnum<{
        "Azure OpenAI": OpenAiProviderType.AzureAi;
    }>;
    apiUrl: z.ZodString;
    defaultModel: z.ZodOptional<z.ZodString>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    contextWindowLength: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    temperature: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strict>, z.ZodObject<{
    apiProvider: z.ZodEnum<{
        OpenAI: OpenAiProviderType.OpenAi;
    }>;
    apiUrl: z.ZodString;
    organizationId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
    defaultModel: z.ZodDefault<z.ZodString>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    contextWindowLength: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    temperature: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strict>, z.ZodObject<{
    apiProvider: z.ZodEnum<{
        Other: OpenAiProviderType.Other;
    }>;
    apiUrl: z.ZodString;
    defaultModel: z.ZodString;
    verificationMode: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        full: "full";
        none: "none";
        certificate: "certificate";
    }>>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    contextWindowLength: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    temperature: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    enableNativeFunctionCalling: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>], "apiProvider">;
export declare const SecretsSchema: z.ZodUnion<readonly [z.ZodObject<{
    apiKey: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    apiKey: z.ZodOptional<z.ZodString>;
    certificateData: z.ZodOptional<z.ZodString>;
    privateKeyData: z.ZodOptional<z.ZodString>;
    caData: z.ZodOptional<z.ZodString>;
}, z.core.$strict>]>;
export declare const RunActionParamsSchema: z.ZodObject<{
    body: z.ZodString;
    signal: z.ZodOptional<z.ZodAny>;
    timeout: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    telemetryMetadata: z.ZodOptional<z.ZodObject<{
        pluginId: z.ZodOptional<z.ZodString>;
        aggregateBy: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const InvokeAIActionParamsSchema: z.ZodObject<{
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodString;
        content: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        function_call: z.ZodOptional<z.ZodObject<{
            arguments: z.ZodString;
            name: z.ZodString;
        }, z.core.$strict>>;
        tool_calls: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            function: z.ZodObject<{
                arguments: z.ZodString;
                name: z.ZodString;
            }, z.core.$strict>;
            type: z.ZodString;
        }, z.core.$strict>>>;
        tool_call_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    model: z.ZodOptional<z.ZodString>;
    tools: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodLiteral<"function">;
        function: z.ZodObject<{
            description: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            parameters: z.ZodObject<{}, z.core.$loose>;
            strict: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$loose>;
    }, z.core.$loose>>>;
    tool_choice: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"none">, z.ZodLiteral<"auto">, z.ZodLiteral<"required">, z.ZodObject<{
        type: z.ZodLiteral<"function">;
        function: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$loose>;
    }, z.core.$strip>]>>;
    functions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        parameters: z.ZodObject<{
            type: z.ZodString;
            properties: z.ZodObject<{}, z.core.$loose>;
            additionalProperties: z.ZodBoolean;
            $schema: z.ZodString;
        }, z.core.$loose>;
    }, z.core.$loose>>>;
    function_call: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"none">, z.ZodLiteral<"auto">, z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>]>>;
    n: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    stop: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>>;
    temperature: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    response_format: z.ZodOptional<z.ZodAny>;
    signal: z.ZodOptional<z.ZodAny>;
    timeout: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    telemetryMetadata: z.ZodOptional<z.ZodObject<{
        pluginId: z.ZodOptional<z.ZodString>;
        aggregateBy: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const InvokeAIActionResponseSchema: z.ZodObject<{
    message: z.ZodString;
    usage: z.ZodObject<{
        prompt_tokens: z.ZodCoercedNumber<unknown>;
        completion_tokens: z.ZodCoercedNumber<unknown>;
        total_tokens: z.ZodCoercedNumber<unknown>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const StreamActionParamsSchema: z.ZodObject<{
    body: z.ZodString;
    stream: z.ZodDefault<z.ZodBoolean>;
    signal: z.ZodOptional<z.ZodAny>;
    timeout: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    telemetryMetadata: z.ZodOptional<z.ZodObject<{
        pluginId: z.ZodOptional<z.ZodString>;
        aggregateBy: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const StreamingResponseSchema: z.ZodAny;
export declare const RunActionResponseSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    object: z.ZodOptional<z.ZodString>;
    created: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    model: z.ZodOptional<z.ZodString>;
    usage: z.ZodObject<{
        prompt_tokens: z.ZodCoercedNumber<unknown>;
        completion_tokens: z.ZodCoercedNumber<unknown>;
        total_tokens: z.ZodCoercedNumber<unknown>;
    }, z.core.$strip>;
    choices: z.ZodArray<z.ZodObject<{
        message: z.ZodObject<{
            role: z.ZodString;
            content: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>;
        finish_reason: z.ZodOptional<z.ZodString>;
        index: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const DashboardActionParamsSchema: z.ZodObject<{
    dashboardId: z.ZodString;
}, z.core.$strict>;
export declare const DashboardActionResponseSchema: z.ZodObject<{
    available: z.ZodBoolean;
}, z.core.$strip>;
