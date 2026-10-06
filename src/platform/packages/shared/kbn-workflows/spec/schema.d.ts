import { z } from '@kbn/zod/v4';
export declare const DurationSchema: z.ZodString;
export declare const ByteSizeSchema: z.ZodString;
export declare const RetryPolicySchema: z.ZodObject<{
    'max-attempts': z.ZodOptional<z.ZodNumber>;
    'timeout-seconds': z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const RetryDelayStrategySchema: z.ZodEnum<{
    exponential: "exponential";
    fixed: "fixed";
}>;
export type RetryDelayStrategy = z.infer<typeof RetryDelayStrategySchema>;
export declare const WorkflowRetrySchema: z.ZodObject<{
    'max-attempts': z.ZodNumber;
    condition: z.ZodOptional<z.ZodString>;
    delay: z.ZodOptional<z.ZodString>;
    strategy: z.ZodOptional<z.ZodEnum<{
        exponential: "exponential";
        fixed: "fixed";
    }>>;
    multiplier: z.ZodOptional<z.ZodNumber>;
    'max-delay': z.ZodOptional<z.ZodString>;
    jitter: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type WorkflowRetry = z.infer<typeof WorkflowRetrySchema>;
export declare const BaseStepSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type BaseStep = z.infer<typeof BaseStepSchema>;
export declare const WorkflowOnFailureSchema: z.ZodObject<{
    retry: z.ZodOptional<z.ZodObject<{
        'max-attempts': z.ZodNumber;
        condition: z.ZodOptional<z.ZodString>;
        delay: z.ZodOptional<z.ZodString>;
        strategy: z.ZodOptional<z.ZodEnum<{
            exponential: "exponential";
            fixed: "fixed";
        }>>;
        multiplier: z.ZodOptional<z.ZodNumber>;
        'max-delay': z.ZodOptional<z.ZodString>;
        jitter: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
}, z.core.$strip>;
export type WorkflowOnFailure = z.infer<typeof WorkflowOnFailureSchema>;
export declare function getOnFailureStepSchema(stepSchema: z.ZodType, loose?: boolean): z.ZodObject<{
    retry: z.ZodOptional<z.ZodObject<{
        'max-attempts': z.ZodNumber;
        condition: z.ZodOptional<z.ZodString>;
        delay: z.ZodOptional<z.ZodString>;
        strategy: z.ZodOptional<z.ZodEnum<{
            exponential: "exponential";
            fixed: "fixed";
        }>>;
        multiplier: z.ZodOptional<z.ZodNumber>;
        'max-delay': z.ZodOptional<z.ZodString>;
        jitter: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    fallback: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
}, z.core.$strip> | z.ZodObject<{
    retry: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        'max-attempts': z.ZodNumber;
        condition: z.ZodOptional<z.ZodString>;
        delay: z.ZodOptional<z.ZodString>;
        strategy: z.ZodOptional<z.ZodEnum<{
            exponential: "exponential";
            fixed: "fixed";
        }>>;
        multiplier: z.ZodOptional<z.ZodNumber>;
        'max-delay': z.ZodOptional<z.ZodString>;
        jitter: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    continue: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
    fallback: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
}, z.core.$strip>;
export declare const CollisionStrategySchema: z.ZodEnum<{
    "cancel-in-progress": "cancel-in-progress";
    drop: "drop";
    queue: "queue";
}>;
export type CollisionStrategy = z.infer<typeof CollisionStrategySchema>;
export declare const DEFAULT_CONCURRENCY_QUEUE_SIZE = 100;
export declare const DEFAULT_CONCURRENCY_QUEUE_TTL = "24h";
export declare const ConcurrencySettingsSchema: z.ZodObject<{
    key: z.ZodOptional<z.ZodString>;
    strategy: z.ZodOptional<z.ZodEnum<{
        "cancel-in-progress": "cancel-in-progress";
        drop: "drop";
        queue: "queue";
    }>>;
    max: z.ZodOptional<z.ZodNumber>;
    'queue-size': z.ZodOptional<z.ZodNumber>;
    'queue-ttl': z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ConcurrencySettings = z.infer<typeof ConcurrencySettingsSchema>;
export declare const LIQUID_PARSE_LIMIT_MAX = 600000;
export declare const LIQUID_RENDER_LIMIT_MAX = 2000;
export declare const LIQUID_MEMORY_LIMIT_MAX = 60000000;
export declare const LiquidSettingsSchema: z.ZodObject<{
    parseLimit: z.ZodOptional<z.ZodNumber>;
    renderLimit: z.ZodOptional<z.ZodNumber>;
    memoryLimit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type LiquidSettings = z.infer<typeof LiquidSettingsSchema>;
export declare const WorkflowSettingsSchema: z.ZodObject<{
    run_as: z.ZodOptional<z.ZodString>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    timezone: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    concurrency: z.ZodOptional<z.ZodObject<{
        key: z.ZodOptional<z.ZodString>;
        strategy: z.ZodOptional<z.ZodEnum<{
            "cancel-in-progress": "cancel-in-progress";
            drop: "drop";
            queue: "queue";
        }>>;
        max: z.ZodOptional<z.ZodNumber>;
        'queue-size': z.ZodOptional<z.ZodNumber>;
        'queue-ttl': z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    'max-step-size': z.ZodOptional<z.ZodString>;
    liquid: z.ZodOptional<z.ZodObject<{
        parseLimit: z.ZodOptional<z.ZodNumber>;
        renderLimit: z.ZodOptional<z.ZodNumber>;
        memoryLimit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type WorkflowSettings = z.infer<typeof WorkflowSettingsSchema>;
export declare function getWorkflowSettingsSchema(stepSchema: z.ZodType, loose?: boolean): z.ZodObject<{
    run_as: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    concurrency: z.ZodOptional<z.ZodObject<{
        key: z.ZodOptional<z.ZodString>;
        strategy: z.ZodOptional<z.ZodEnum<{
            "cancel-in-progress": "cancel-in-progress";
            drop: "drop";
            queue: "queue";
        }>>;
        max: z.ZodOptional<z.ZodNumber>;
        'queue-size': z.ZodOptional<z.ZodNumber>;
        'queue-ttl': z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    'max-step-size': z.ZodOptional<z.ZodString>;
    liquid: z.ZodOptional<z.ZodObject<{
        parseLimit: z.ZodOptional<z.ZodNumber>;
        renderLimit: z.ZodOptional<z.ZodNumber>;
        memoryLimit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    }, z.core.$strip>> | z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
        fallback: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
    }, z.core.$strip>>;
}, z.core.$strip> | z.ZodObject<{
    run_as: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    timezone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    timeout: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    concurrency: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        key: z.ZodOptional<z.ZodString>;
        strategy: z.ZodOptional<z.ZodEnum<{
            "cancel-in-progress": "cancel-in-progress";
            drop: "drop";
            queue: "queue";
        }>>;
        max: z.ZodOptional<z.ZodNumber>;
        'queue-size': z.ZodOptional<z.ZodNumber>;
        'queue-ttl': z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    'max-step-size': z.ZodOptional<z.ZodOptional<z.ZodString>>;
    liquid: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        parseLimit: z.ZodOptional<z.ZodNumber>;
        renderLimit: z.ZodOptional<z.ZodNumber>;
        memoryLimit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
    'on-failure': z.ZodOptional<z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    }, z.core.$strip>> | z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
        fallback: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const TimeoutPropSchema: z.ZodObject<{
    timeout: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type TimeoutProp = z.infer<typeof TimeoutPropSchema>;
/** Upper bound on a Liquid duration template. Matches other dynamic expressions in this schema. */
export declare const DYNAMIC_TIMEOUT_TEMPLATE_MAX_LENGTH = 2000;
/** A duration, or Liquid that renders to one at step entry. */
export declare const DynamicTimeoutSchema: z.ZodUnion<readonly [z.ZodString, z.ZodString]>;
/** A wait duration, or Liquid that renders to one at step entry. */
export declare const DynamicDurationSchema: z.ZodUnion<readonly [z.ZodString, z.ZodString]>;
export declare const DynamicTimeoutPropSchema: z.ZodObject<{
    timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
}, z.core.$strip>;
export declare const MaxStepSizePropSchema: z.ZodObject<{
    'max-step-size': z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type MaxStepSizeProp = z.infer<typeof MaxStepSizePropSchema>;
export declare const MaxIterationsObjectSchema: z.ZodObject<{
    limit: z.ZodNumber;
    'on-limit': z.ZodEnum<{
        continue: "continue";
        fail: "fail";
    }>;
}, z.core.$strip>;
export declare const MaxIterationsSchema: z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
    limit: z.ZodNumber;
    'on-limit': z.ZodEnum<{
        continue: "continue";
        fail: "fail";
    }>;
}, z.core.$strip>]>;
export type MaxIterations = z.infer<typeof MaxIterationsSchema>;
export declare const DEFAULT_LOOP_MAX_ITERATIONS = 2000;
export declare const LoopStepPropsSchema: z.ZodObject<{
    'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        limit: z.ZodNumber;
        'on-limit': z.ZodEnum<{
            continue: "continue";
            fail: "fail";
        }>;
    }, z.core.$strip>]>>;
    'iteration-timeout': z.ZodOptional<z.ZodString>;
    'iteration-on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type LoopStepProps = z.infer<typeof LoopStepPropsSchema>;
declare const StepWithForEachSchema: z.ZodObject<{
    foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
}, z.core.$strip>;
export type StepWithForeach = z.infer<typeof StepWithForEachSchema>;
export type StepWithOnFailure = z.infer<typeof StepWithOnFailureSchema>;
export declare const StepWithIfConditionSchema: z.ZodObject<{
    if: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type StepWithIfCondition = z.infer<typeof StepWithIfConditionSchema>;
export declare const StepWithOnFailureSchema: z.ZodObject<{
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const BaseConnectorStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
    foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    type: z.ZodString;
    with: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export type ConnectorStep = z.infer<typeof BaseConnectorStepSchema>;
export declare const BuiltInStepProperties: string[];
export type BuiltInStepProperty = (typeof BuiltInStepProperties)[number];
export declare const WaitStepInputSchema: z.ZodObject<{
    duration: z.ZodUnion<readonly [z.ZodString, z.ZodString]>;
}, z.core.$strip>;
export declare const WaitStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"wait">;
    with: z.ZodObject<{
        duration: z.ZodUnion<readonly [z.ZodString, z.ZodString]>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type WaitStep = z.infer<typeof WaitStepSchema>;
export declare const WaitForApprovalSlackChannelSchema: z.ZodObject<{
    'connector-id': z.ZodString;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const WaitForApprovalSlackApiChannelSchema: z.ZodObject<{
    'connector-id': z.ZodString;
    channels: z.ZodArray<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const WaitForApprovalChannelsSchema: z.ZodOptional<z.ZodObject<{
    slack: z.ZodOptional<z.ZodObject<{
        'connector-id': z.ZodString;
        message: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    slack_api: z.ZodOptional<z.ZodObject<{
        'connector-id': z.ZodString;
        channels: z.ZodArray<z.ZodString>;
        message: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>>;
export declare const HitlExternalChannelsSchema: z.ZodOptional<z.ZodObject<{
    slack: z.ZodOptional<z.ZodObject<{
        'connector-id': z.ZodString;
        message: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    slack_api: z.ZodOptional<z.ZodObject<{
        'connector-id': z.ZodString;
        channels: z.ZodArray<z.ZodString>;
        message: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>>;
export declare const WaitForInputStepInputSchema: z.ZodOptional<z.ZodObject<{
    message: z.ZodOptional<z.ZodString>;
    schema: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodLiteral<"object">>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        $ref: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            [x: string]: string;
        }>, z.ZodString]>>;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        additionalProperties: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>]>>;
        required: z.ZodOptional<z.ZodArray<z.ZodString>>;
        definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
    }, z.core.$strip>>;
    channels: z.ZodOptional<z.ZodObject<{
        slack: z.ZodOptional<z.ZodObject<{
            'connector-id': z.ZodString;
            message: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        slack_api: z.ZodOptional<z.ZodObject<{
            'connector-id': z.ZodString;
            channels: z.ZodArray<z.ZodString>;
            message: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>>;
export declare const WaitForInputStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    type: z.ZodLiteral<"waitForInput">;
    with: z.ZodOptional<z.ZodObject<{
        message: z.ZodOptional<z.ZodString>;
        schema: z.ZodOptional<z.ZodObject<{
            type: z.ZodOptional<z.ZodLiteral<"object">>;
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            $ref: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                [x: string]: string;
            }>, z.ZodString]>>;
            properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
            additionalProperties: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>]>>;
            required: z.ZodOptional<z.ZodArray<z.ZodString>>;
            definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
            $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        }, z.core.$strip>>;
        channels: z.ZodOptional<z.ZodObject<{
            slack: z.ZodOptional<z.ZodObject<{
                'connector-id': z.ZodString;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            slack_api: z.ZodOptional<z.ZodObject<{
                'connector-id': z.ZodString;
                channels: z.ZodArray<z.ZodString>;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type WaitForInputStep = z.infer<typeof WaitForInputStepSchema>;
export declare const WaitForApprovalStepInputSchema: z.ZodOptional<z.ZodObject<{
    message: z.ZodOptional<z.ZodString>;
    approveLabel: z.ZodOptional<z.ZodString>;
    rejectLabel: z.ZodOptional<z.ZodString>;
    channels: z.ZodOptional<z.ZodObject<{
        slack: z.ZodOptional<z.ZodObject<{
            'connector-id': z.ZodString;
            message: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        slack_api: z.ZodOptional<z.ZodObject<{
            'connector-id': z.ZodString;
            channels: z.ZodArray<z.ZodString>;
            message: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>>;
export declare const WaitForApprovalStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    type: z.ZodLiteral<"waitForApproval">;
    with: z.ZodOptional<z.ZodObject<{
        message: z.ZodOptional<z.ZodString>;
        approveLabel: z.ZodOptional<z.ZodString>;
        rejectLabel: z.ZodOptional<z.ZodString>;
        channels: z.ZodOptional<z.ZodObject<{
            slack: z.ZodOptional<z.ZodObject<{
                'connector-id': z.ZodString;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            slack_api: z.ZodOptional<z.ZodObject<{
                'connector-id': z.ZodString;
                channels: z.ZodArray<z.ZodString>;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type WaitForApprovalStep = z.infer<typeof WaitForApprovalStepSchema>;
export declare const DataSetStepInputSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
export declare const DataSetStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"data.set">;
    with: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export type DataSetStep = z.infer<typeof DataSetStepSchema>;
export declare const IGNORED_KIBANA_FETCHER_SETTING_MESSAGE = "The \"fetcher\" setting is deprecated and some options are already ignored. Please remove this setting. Configure self HTTP routing, TLS, and redirects with `server.selfHttp`. Use `max-step-size` for response limits.";
export declare const FetcherConfigSchema: z.ZodOptional<z.ZodObject<{
    skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
    follow_redirects: z.ZodOptional<z.ZodBoolean>;
    max_redirects: z.ZodOptional<z.ZodNumber>;
    keep_alive: z.ZodOptional<z.ZodBoolean>;
    max_content_length: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>>;
export declare const KibanaFetcherConfigSchema: z.ZodOptional<z.ZodObject<{
    skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
    follow_redirects: z.ZodOptional<z.ZodBoolean>;
    max_redirects: z.ZodOptional<z.ZodNumber>;
    keep_alive: z.ZodOptional<z.ZodBoolean>;
    max_content_length: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>>;
export declare const KibanaHttpMethods: readonly ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
export declare const KibanaHttpMethodSchema: z.ZodEnum<{
    DELETE: "DELETE";
    GET: "GET";
    PATCH: "PATCH";
    POST: "POST";
    PUT: "PUT";
}>;
export declare const ElasticsearchStepInputSchema: z.ZodUnion<readonly [z.ZodObject<{
    request: z.ZodObject<{
        method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            DELETE: "DELETE";
            GET: "GET";
            HEAD: "HEAD";
            PATCH: "PATCH";
            POST: "POST";
            PUT: "PUT";
        }>>>;
        path: z.ZodString;
        body: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
    index: z.ZodOptional<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    size: z.ZodOptional<z.ZodNumber>;
    from: z.ZodOptional<z.ZodNumber>;
    sort: z.ZodOptional<z.ZodArray<z.ZodAny>>;
    _source: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodArray<z.ZodString>, z.ZodString]>>;
    aggs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    aggregations: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>>]>;
export declare const ElasticsearchStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    with: z.ZodUnion<readonly [z.ZodObject<{
        request: z.ZodObject<{
            method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                DELETE: "DELETE";
                GET: "GET";
                HEAD: "HEAD";
                PATCH: "PATCH";
                POST: "POST";
                PUT: "PUT";
            }>>>;
            path: z.ZodString;
            body: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>;
    }, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
        index: z.ZodOptional<z.ZodString>;
        id: z.ZodOptional<z.ZodString>;
        query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        size: z.ZodOptional<z.ZodNumber>;
        from: z.ZodOptional<z.ZodNumber>;
        sort: z.ZodOptional<z.ZodArray<z.ZodAny>>;
        _source: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodArray<z.ZodString>, z.ZodString]>>;
        aggs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        aggregations: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>>]>;
}, z.core.$strip>;
export type ElasticsearchStep = z.infer<typeof ElasticsearchStepSchema>;
export declare const KibanaStepMetaSchema: {
    use_server_info: z.ZodOptional<z.ZodBoolean>;
    use_localhost: z.ZodOptional<z.ZodBoolean>;
    debug: z.ZodOptional<z.ZodBoolean>;
};
export declare const KibanaStepInputSchema: z.ZodUnion<readonly [z.ZodObject<{
    use_server_info: z.ZodOptional<z.ZodBoolean>;
    use_localhost: z.ZodOptional<z.ZodBoolean>;
    debug: z.ZodOptional<z.ZodBoolean>;
    request: z.ZodObject<{
        method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            DELETE: "DELETE";
            GET: "GET";
            PATCH: "PATCH";
            POST: "POST";
            PUT: "PUT";
        }>>>;
        path: z.ZodString;
        body: z.ZodOptional<z.ZodAny>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>;
    fetcher: z.ZodOptional<z.ZodObject<{
        skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
        follow_redirects: z.ZodOptional<z.ZodBoolean>;
        max_redirects: z.ZodOptional<z.ZodNumber>;
        keep_alive: z.ZodOptional<z.ZodBoolean>;
        max_content_length: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
    use_server_info: z.ZodOptional<z.ZodBoolean>;
    use_localhost: z.ZodOptional<z.ZodBoolean>;
    debug: z.ZodOptional<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    severity: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        high: "high";
        low: "low";
        medium: "medium";
    }>>;
    assignees: z.ZodOptional<z.ZodArray<z.ZodString>>;
    owner: z.ZodOptional<z.ZodString>;
    connector: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    id: z.ZodOptional<z.ZodString>;
    case_id: z.ZodOptional<z.ZodString>;
    space_id: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodNumber>;
    perPage: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodString>;
    fetcher: z.ZodOptional<z.ZodObject<{
        skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
        follow_redirects: z.ZodOptional<z.ZodBoolean>;
        max_redirects: z.ZodOptional<z.ZodNumber>;
        keep_alive: z.ZodOptional<z.ZodBoolean>;
        max_content_length: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>>]>;
export declare const KibanaStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    with: z.ZodUnion<readonly [z.ZodObject<{
        use_server_info: z.ZodOptional<z.ZodBoolean>;
        use_localhost: z.ZodOptional<z.ZodBoolean>;
        debug: z.ZodOptional<z.ZodBoolean>;
        request: z.ZodObject<{
            method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                DELETE: "DELETE";
                GET: "GET";
                PATCH: "PATCH";
                POST: "POST";
                PUT: "PUT";
            }>>>;
            path: z.ZodString;
            body: z.ZodOptional<z.ZodAny>;
            headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>;
        fetcher: z.ZodOptional<z.ZodObject<{
            skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
            follow_redirects: z.ZodOptional<z.ZodBoolean>;
            max_redirects: z.ZodOptional<z.ZodNumber>;
            keep_alive: z.ZodOptional<z.ZodBoolean>;
            max_content_length: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
        use_server_info: z.ZodOptional<z.ZodBoolean>;
        use_localhost: z.ZodOptional<z.ZodBoolean>;
        debug: z.ZodOptional<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        severity: z.ZodOptional<z.ZodEnum<{
            critical: "critical";
            high: "high";
            low: "low";
            medium: "medium";
        }>>;
        assignees: z.ZodOptional<z.ZodArray<z.ZodString>>;
        owner: z.ZodOptional<z.ZodString>;
        connector: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        id: z.ZodOptional<z.ZodString>;
        case_id: z.ZodOptional<z.ZodString>;
        space_id: z.ZodOptional<z.ZodString>;
        page: z.ZodOptional<z.ZodNumber>;
        perPage: z.ZodOptional<z.ZodNumber>;
        status: z.ZodOptional<z.ZodString>;
        fetcher: z.ZodOptional<z.ZodObject<{
            skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
            follow_redirects: z.ZodOptional<z.ZodBoolean>;
            max_redirects: z.ZodOptional<z.ZodNumber>;
            keep_alive: z.ZodOptional<z.ZodBoolean>;
            max_content_length: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>>]>;
}, z.core.$strip>;
export type KibanaStep = z.infer<typeof KibanaStepSchema>;
export declare const ForEachStepConfigSchema: z.ZodObject<{
    foreach: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ForEachStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        limit: z.ZodNumber;
        'on-limit': z.ZodEnum<{
            continue: "continue";
            fail: "fail";
        }>;
    }, z.core.$strip>]>>;
    'iteration-timeout': z.ZodOptional<z.ZodString>;
    'iteration-on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    foreach: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    type: z.ZodLiteral<"foreach">;
}, z.core.$strip>;
export type ForEachStep = z.infer<typeof ForEachStepSchema>;
export declare const getForEachStepSchema: (stepSchema: z.ZodType, loose?: boolean) => z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        limit: z.ZodNumber;
        'on-limit': z.ZodEnum<{
            continue: "continue";
            fail: "fail";
        }>;
    }, z.core.$strip>]>>;
    'iteration-timeout': z.ZodOptional<z.ZodString>;
    foreach: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>;
    type: z.ZodLiteral<"foreach">;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    }, z.core.$strip>> | z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
        fallback: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
    }, z.core.$strip>>;
    'iteration-on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    }, z.core.$strip>> | z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
        fallback: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
    }, z.core.$strip>>;
    steps: z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
}, z.core.$strip> | z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    'max-step-size': z.ZodOptional<z.ZodOptional<z.ZodString>>;
    if: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    timeout: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    'max-iterations': z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        limit: z.ZodNumber;
        'on-limit': z.ZodEnum<{
            continue: "continue";
            fail: "fail";
        }>;
    }, z.core.$strip>]>>>;
    'iteration-timeout': z.ZodOptional<z.ZodOptional<z.ZodString>>;
    foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
    type: z.ZodNonOptional<z.ZodOptional<z.ZodLiteral<"foreach">>>;
    'on-failure': z.ZodOptional<z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    }, z.core.$strip>> | z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
        fallback: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
    }, z.core.$strip>>>;
    'iteration-on-failure': z.ZodOptional<z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    }, z.core.$strip>> | z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
        fallback: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
    }, z.core.$strip>>>;
    steps: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
}, z.core.$strip>;
export declare const WhileStepConfigSchema: z.ZodObject<{
    condition: z.ZodString;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const WhileStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        limit: z.ZodNumber;
        'on-limit': z.ZodEnum<{
            continue: "continue";
            fail: "fail";
        }>;
    }, z.core.$strip>]>>;
    'iteration-timeout': z.ZodOptional<z.ZodString>;
    'iteration-on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    condition: z.ZodString;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    type: z.ZodLiteral<"while">;
}, z.core.$strip>;
export type WhileStep = z.infer<typeof WhileStepSchema>;
export declare const getWhileStepSchema: (stepSchema: z.ZodType, loose?: boolean) => z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        limit: z.ZodNumber;
        'on-limit': z.ZodEnum<{
            continue: "continue";
            fail: "fail";
        }>;
    }, z.core.$strip>]>>;
    'iteration-timeout': z.ZodOptional<z.ZodString>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    }, z.core.$strip>> | z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
        fallback: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
    }, z.core.$strip>>;
    'iteration-on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    }, z.core.$strip>> | z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
        fallback: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
    }, z.core.$strip>>;
    condition: z.ZodString;
    type: z.ZodLiteral<"while">;
    steps: z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
}, z.core.$strip> | z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    'max-step-size': z.ZodOptional<z.ZodOptional<z.ZodString>>;
    if: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    timeout: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    'max-iterations': z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        limit: z.ZodNumber;
        'on-limit': z.ZodEnum<{
            continue: "continue";
            fail: "fail";
        }>;
    }, z.core.$strip>]>>>;
    'iteration-timeout': z.ZodOptional<z.ZodOptional<z.ZodString>>;
    'on-failure': z.ZodOptional<z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    }, z.core.$strip>> | z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
        fallback: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
    }, z.core.$strip>>>;
    'iteration-on-failure': z.ZodOptional<z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    }, z.core.$strip>> | z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
        fallback: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
    }, z.core.$strip>>>;
    condition: z.ZodOptional<z.ZodString>;
    type: z.ZodNonOptional<z.ZodOptional<z.ZodLiteral<"while">>>;
    steps: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
}, z.core.$strip>;
export declare const SwitchCaseSchema: z.ZodObject<{
    match: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type SwitchCase = z.infer<typeof SwitchCaseSchema>;
export declare const SwitchStepConfigSchema: z.ZodObject<{
    expression: z.ZodString;
    cases: z.ZodArray<z.ZodObject<{
        match: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    default: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const SwitchStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    expression: z.ZodString;
    cases: z.ZodArray<z.ZodObject<{
        match: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    default: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    type: z.ZodLiteral<"switch">;
}, z.core.$strip>;
export type SwitchStep = z.infer<typeof SwitchStepSchema>;
export declare const getSwitchStepSchema: (stepSchema: z.ZodType, loose?: boolean) => z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    expression: z.ZodString;
    type: z.ZodLiteral<"switch">;
    cases: z.ZodArray<z.ZodObject<{
        match: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>;
        steps: z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    }, z.core.$strip>>;
    default: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
}, z.core.$strip> | z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    'max-step-size': z.ZodOptional<z.ZodOptional<z.ZodString>>;
    if: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    timeout: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    expression: z.ZodOptional<z.ZodString>;
    type: z.ZodNonOptional<z.ZodOptional<z.ZodLiteral<"switch">>>;
    cases: z.ZodOptional<z.ZodArray<z.ZodObject<{
        match: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>;
        steps: z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    }, z.core.$strip>>>;
    default: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
}, z.core.$strip>;
export declare const IfStepConfigSchema: z.ZodObject<{
    condition: z.ZodString;
    if: z.ZodOptional<z.ZodNever>;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    else: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const IfStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    condition: z.ZodString;
    if: z.ZodOptional<z.ZodNever>;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    else: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    type: z.ZodLiteral<"if">;
}, z.core.$strip>;
export type IfStep = z.infer<typeof IfStepSchema>;
export declare const getIfStepSchema: (stepSchema: z.ZodType, loose?: boolean) => z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    condition: z.ZodString;
    if: z.ZodOptional<z.ZodNever>;
    type: z.ZodLiteral<"if">;
    steps: z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    else: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
}, z.core.$strip> | z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    'max-step-size': z.ZodOptional<z.ZodOptional<z.ZodString>>;
    condition: z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodOptional<z.ZodNever>>;
    type: z.ZodNonOptional<z.ZodOptional<z.ZodLiteral<"if">>>;
    steps: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    else: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
}, z.core.$strip>;
export declare const DEFAULT_PARALLEL_CONCURRENCY = 5;
export declare const DEFAULT_PARALLEL_MAX_CONCURRENCY = 20;
export declare const DEFAULT_PARALLEL_MAX_FAN_OUT = 100;
export declare const PARALLEL_BRANCH_NAME_MAX_LENGTH = 256;
export declare const PARALLEL_FOREACH_EXPRESSION_MAX_LENGTH = 2000;
export declare const ParallelConcurrencyObjectSchema: z.ZodObject<{
    max: z.ZodOptional<z.ZodNumber>;
    'count-waiting': z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type ParallelConcurrencyObject = z.infer<typeof ParallelConcurrencyObjectSchema>;
export declare const ParallelConcurrencySchema: z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
    max: z.ZodOptional<z.ZodNumber>;
    'count-waiting': z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>]>;
export declare const ParallelModeSchema: z.ZodEnum<{
    "fail-fast": "fail-fast";
    settled: "settled";
}>;
export type ParallelMode = z.infer<typeof ParallelModeSchema>;
export declare const ParallelBranchSchema: z.ZodObject<{
    name: z.ZodString;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ParallelStepConfigSchema: z.ZodObject<{
    foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    branches: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    concurrency: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        max: z.ZodOptional<z.ZodNumber>;
        'count-waiting': z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>;
    mode: z.ZodOptional<z.ZodEnum<{
        "fail-fast": "fail-fast";
        settled: "settled";
    }>>;
    'branch-timeout': z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ParallelStepObjectSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    branches: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    concurrency: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        max: z.ZodOptional<z.ZodNumber>;
        'count-waiting': z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>;
    mode: z.ZodOptional<z.ZodEnum<{
        "fail-fast": "fail-fast";
        settled: "settled";
    }>>;
    'branch-timeout': z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"parallel">;
}, z.core.$strip>;
export declare const PARALLEL_MODE_REFINEMENT_MESSAGE: string;
export declare const PARALLEL_BRANCH_NAMES_UNIQUE_MESSAGE: string;
export declare const ParallelStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    branches: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    concurrency: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        max: z.ZodOptional<z.ZodNumber>;
        'count-waiting': z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>;
    mode: z.ZodOptional<z.ZodEnum<{
        "fail-fast": "fail-fast";
        settled: "settled";
    }>>;
    'branch-timeout': z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"parallel">;
}, z.core.$strip>;
export type ParallelStep = z.infer<typeof ParallelStepObjectSchema>;
export declare const getParallelStepSchema: (stepSchema: z.ZodType, loose?: boolean) => z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
    concurrency: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        max: z.ZodOptional<z.ZodNumber>;
        'count-waiting': z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>;
    mode: z.ZodOptional<z.ZodEnum<{
        "fail-fast": "fail-fast";
        settled: "settled";
    }>>;
    'branch-timeout': z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"parallel">;
    steps: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    branches: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        steps: z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    }, z.core.$strip>>>;
}, z.core.$strip> | z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    'max-step-size': z.ZodOptional<z.ZodOptional<z.ZodString>>;
    if: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    timeout: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    foreach: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>>;
    concurrency: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        max: z.ZodOptional<z.ZodNumber>;
        'count-waiting': z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>>;
    mode: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        "fail-fast": "fail-fast";
        settled: "settled";
    }>>>;
    'branch-timeout': z.ZodOptional<z.ZodOptional<z.ZodString>>;
    type: z.ZodNonOptional<z.ZodOptional<z.ZodLiteral<"parallel">>>;
    steps: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>>;
    branches: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        steps: z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    }, z.core.$strip>>>>;
}, z.core.$strip>;
export declare const MergeStepConfigSchema: z.ZodObject<{
    sources: z.ZodArray<z.ZodString>;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const MergeStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    sources: z.ZodArray<z.ZodString>;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    type: z.ZodLiteral<"merge">;
}, z.core.$strip>;
export type MergeStep = z.infer<typeof MergeStepSchema>;
export declare const getMergeStepSchema: (stepSchema: z.ZodType, loose?: boolean) => z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    sources: z.ZodArray<z.ZodString>;
    type: z.ZodLiteral<"merge">;
    steps: z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
}, z.core.$strip> | z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    'max-step-size': z.ZodOptional<z.ZodOptional<z.ZodString>>;
    if: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    sources: z.ZodOptional<z.ZodArray<z.ZodString>>;
    type: z.ZodNonOptional<z.ZodOptional<z.ZodLiteral<"merge">>>;
    steps: z.ZodOptional<z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
}, z.core.$strip>;
export declare const LoopBreakStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"loop.break">;
}, z.core.$strip>;
export type LoopBreakStep = z.infer<typeof LoopBreakStepSchema>;
export declare const LoopContinueStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"loop.continue">;
}, z.core.$strip>;
export type LoopContinueStep = z.infer<typeof LoopContinueStepSchema>;
export declare const ConsoleStepInputSchema: z.ZodObject<{
    message: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export declare const WorkflowExecuteStepInputSchema: z.ZodObject<{
    'workflow-id': z.ZodString;
    inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const WorkflowExecuteStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    with: z.ZodObject<{
        'workflow-id': z.ZodString;
        inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
    type: z.ZodLiteral<"workflow.execute">;
}, z.core.$strip>;
export type WorkflowExecuteStep = z.infer<typeof WorkflowExecuteStepSchema>;
export declare const WorkflowExecuteAsyncStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    with: z.ZodObject<{
        'workflow-id': z.ZodString;
        inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
    type: z.ZodLiteral<"workflow.executeAsync">;
}, z.core.$strip>;
export type WorkflowExecuteAsyncStep = z.infer<typeof WorkflowExecuteAsyncStepSchema>;
export declare const WorkflowExecuteAsyncStepOutputSchema: z.ZodObject<{
    workflowId: z.ZodString;
    executionId: z.ZodString;
    awaited: z.ZodBoolean;
    status: z.ZodString;
    startedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const WorkflowOutputStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"workflow.output">;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        cancelled: "cancelled";
        completed: "completed";
        failed: "failed";
    }>>>;
    with: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.core.$strip>;
export type WorkflowOutputStep = z.infer<typeof WorkflowOutputStepSchema>;
export declare const WorkflowFailStepSchema: z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"workflow.fail">;
    with: z.ZodOptional<z.ZodObject<{
        message: z.ZodOptional<z.ZodString>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type WorkflowFailStep = z.infer<typeof WorkflowFailStepSchema>;
export declare const WorkflowOutputSchema: z.ZodUnion<readonly [z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodBoolean>;
    type: z.ZodLiteral<"string">;
    default: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodBoolean>;
    type: z.ZodLiteral<"number">;
    default: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodBoolean>;
    type: z.ZodLiteral<"boolean">;
    default: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodBoolean>;
    type: z.ZodLiteral<"choice">;
    default: z.ZodOptional<z.ZodString>;
    options: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodBoolean>;
    type: z.ZodLiteral<"array">;
    minItems: z.ZodOptional<z.ZodNumber>;
    maxItems: z.ZodOptional<z.ZodNumber>;
    default: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodNumber>, z.ZodArray<z.ZodBoolean>]>>;
}, z.core.$strip>]>;
export type WorkflowOutput = z.infer<typeof WorkflowOutputSchema>;
export declare const WorkflowConstsSchema: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodObject<{}, z.core.$strip>, z.ZodArray<z.ZodAny>]>>;
declare const StepSchema: z.ZodLazy<z.ZodUnion<readonly [z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        limit: z.ZodNumber;
        'on-limit': z.ZodEnum<{
            continue: "continue";
            fail: "fail";
        }>;
    }, z.core.$strip>]>>;
    'iteration-timeout': z.ZodOptional<z.ZodString>;
    'iteration-on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    foreach: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    type: z.ZodLiteral<"foreach">;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        limit: z.ZodNumber;
        'on-limit': z.ZodEnum<{
            continue: "continue";
            fail: "fail";
        }>;
    }, z.core.$strip>]>>;
    'iteration-timeout': z.ZodOptional<z.ZodString>;
    'iteration-on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    condition: z.ZodString;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    type: z.ZodLiteral<"while">;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    condition: z.ZodString;
    if: z.ZodOptional<z.ZodNever>;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    else: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    type: z.ZodLiteral<"if">;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    expression: z.ZodString;
    cases: z.ZodArray<z.ZodObject<{
        match: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    default: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    type: z.ZodLiteral<"switch">;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"wait">;
    with: z.ZodObject<{
        duration: z.ZodUnion<readonly [z.ZodString, z.ZodString]>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    type: z.ZodLiteral<"waitForInput">;
    with: z.ZodOptional<z.ZodObject<{
        message: z.ZodOptional<z.ZodString>;
        schema: z.ZodOptional<z.ZodObject<{
            type: z.ZodOptional<z.ZodLiteral<"object">>;
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            $ref: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                [x: string]: string;
            }>, z.ZodString]>>;
            properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
            additionalProperties: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>]>>;
            required: z.ZodOptional<z.ZodArray<z.ZodString>>;
            definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
            $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        }, z.core.$strip>>;
        channels: z.ZodOptional<z.ZodObject<{
            slack: z.ZodOptional<z.ZodObject<{
                'connector-id': z.ZodString;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            slack_api: z.ZodOptional<z.ZodObject<{
                'connector-id': z.ZodString;
                channels: z.ZodArray<z.ZodString>;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    type: z.ZodLiteral<"waitForApproval">;
    with: z.ZodOptional<z.ZodObject<{
        message: z.ZodOptional<z.ZodString>;
        approveLabel: z.ZodOptional<z.ZodString>;
        rejectLabel: z.ZodOptional<z.ZodString>;
        channels: z.ZodOptional<z.ZodObject<{
            slack: z.ZodOptional<z.ZodObject<{
                'connector-id': z.ZodString;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            slack_api: z.ZodOptional<z.ZodObject<{
                'connector-id': z.ZodString;
                channels: z.ZodArray<z.ZodString>;
                message: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"data.set">;
    with: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    with: z.ZodUnion<readonly [z.ZodObject<{
        request: z.ZodObject<{
            method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                DELETE: "DELETE";
                GET: "GET";
                HEAD: "HEAD";
                PATCH: "PATCH";
                POST: "POST";
                PUT: "PUT";
            }>>>;
            path: z.ZodString;
            body: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>;
    }, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
        index: z.ZodOptional<z.ZodString>;
        id: z.ZodOptional<z.ZodString>;
        query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        size: z.ZodOptional<z.ZodNumber>;
        from: z.ZodOptional<z.ZodNumber>;
        sort: z.ZodOptional<z.ZodArray<z.ZodAny>>;
        _source: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodArray<z.ZodString>, z.ZodString]>>;
        aggs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        aggregations: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>>]>;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    with: z.ZodUnion<readonly [z.ZodObject<{
        use_server_info: z.ZodOptional<z.ZodBoolean>;
        use_localhost: z.ZodOptional<z.ZodBoolean>;
        debug: z.ZodOptional<z.ZodBoolean>;
        request: z.ZodObject<{
            method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                DELETE: "DELETE";
                GET: "GET";
                PATCH: "PATCH";
                POST: "POST";
                PUT: "PUT";
            }>>>;
            path: z.ZodString;
            body: z.ZodOptional<z.ZodAny>;
            headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>;
        fetcher: z.ZodOptional<z.ZodObject<{
            skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
            follow_redirects: z.ZodOptional<z.ZodBoolean>;
            max_redirects: z.ZodOptional<z.ZodNumber>;
            keep_alive: z.ZodOptional<z.ZodBoolean>;
            max_content_length: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
        use_server_info: z.ZodOptional<z.ZodBoolean>;
        use_localhost: z.ZodOptional<z.ZodBoolean>;
        debug: z.ZodOptional<z.ZodBoolean>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        severity: z.ZodOptional<z.ZodEnum<{
            critical: "critical";
            high: "high";
            low: "low";
            medium: "medium";
        }>>;
        assignees: z.ZodOptional<z.ZodArray<z.ZodString>>;
        owner: z.ZodOptional<z.ZodString>;
        connector: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        id: z.ZodOptional<z.ZodString>;
        case_id: z.ZodOptional<z.ZodString>;
        space_id: z.ZodOptional<z.ZodString>;
        page: z.ZodOptional<z.ZodNumber>;
        perPage: z.ZodOptional<z.ZodNumber>;
        status: z.ZodOptional<z.ZodString>;
        fetcher: z.ZodOptional<z.ZodObject<{
            skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
            follow_redirects: z.ZodOptional<z.ZodBoolean>;
            max_redirects: z.ZodOptional<z.ZodNumber>;
            keep_alive: z.ZodOptional<z.ZodBoolean>;
            max_content_length: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>>]>;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodString>;
    foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    branches: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    concurrency: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        max: z.ZodOptional<z.ZodNumber>;
        'count-waiting': z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>;
    mode: z.ZodOptional<z.ZodEnum<{
        "fail-fast": "fail-fast";
        settled: "settled";
    }>>;
    'branch-timeout': z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"parallel">;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    sources: z.ZodArray<z.ZodString>;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    type: z.ZodLiteral<"merge">;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    with: z.ZodObject<{
        'workflow-id': z.ZodString;
        inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
    type: z.ZodLiteral<"workflow.execute">;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    with: z.ZodObject<{
        'workflow-id': z.ZodString;
        inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
    type: z.ZodLiteral<"workflow.executeAsync">;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"workflow.output">;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        cancelled: "cancelled";
        completed: "completed";
        failed: "failed";
    }>>>;
    with: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"workflow.fail">;
    with: z.ZodOptional<z.ZodObject<{
        message: z.ZodOptional<z.ZodString>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"loop.break">;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"loop.continue">;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodString;
    'max-step-size': z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
    foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
    'on-failure': z.ZodOptional<z.ZodObject<{
        retry: z.ZodOptional<z.ZodObject<{
            'max-attempts': z.ZodNumber;
            condition: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                exponential: "exponential";
                fixed: "fixed";
            }>>;
            multiplier: z.ZodOptional<z.ZodNumber>;
            'max-delay': z.ZodOptional<z.ZodString>;
            jitter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
    }, z.core.$strip>>;
    type: z.ZodString;
    with: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>]>>;
export type Step = z.infer<typeof StepSchema>;
export declare const LoopStepTypes: readonly ["foreach", "while"];
export type LoopStepType = (typeof LoopStepTypes)[number];
export declare const BuiltInStepTypes: ("data.set" | "foreach" | "if" | "loop.break" | "loop.continue" | "merge" | "parallel" | "switch" | "wait" | "waitForApproval" | "waitForInput" | "while" | "workflow.execute" | "workflow.executeAsync" | "workflow.fail" | "workflow.output")[];
export type BuiltInStepType = (typeof BuiltInStepTypes)[number];
declare const WorkflowSchemaBase: z.ZodObject<{
    version: z.ZodDefault<z.ZodOptional<z.ZodLiteral<"1">>>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    settings: z.ZodOptional<z.ZodObject<{
        run_as: z.ZodOptional<z.ZodString>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        timezone: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        concurrency: z.ZodOptional<z.ZodObject<{
            key: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                "cancel-in-progress": "cancel-in-progress";
                drop: "drop";
                queue: "queue";
            }>>;
            max: z.ZodOptional<z.ZodNumber>;
            'queue-size': z.ZodOptional<z.ZodNumber>;
            'queue-ttl': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        'max-step-size': z.ZodOptional<z.ZodString>;
        liquid: z.ZodOptional<z.ZodObject<{
            parseLimit: z.ZodOptional<z.ZodNumber>;
            renderLimit: z.ZodOptional<z.ZodNumber>;
            memoryLimit: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    outputs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodOptional<z.ZodLiteral<"object">>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        $ref: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            [x: string]: string;
        }>, z.ZodString]>>;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        additionalProperties: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>]>>;
        required: z.ZodOptional<z.ZodArray<z.ZodString>>;
        definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
    }, z.core.$strip>, z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        type: z.ZodLiteral<"string">;
        default: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        type: z.ZodLiteral<"number">;
        default: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        type: z.ZodLiteral<"boolean">;
        default: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        type: z.ZodLiteral<"choice">;
        default: z.ZodOptional<z.ZodString>;
        options: z.ZodArray<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        type: z.ZodLiteral<"array">;
        minItems: z.ZodOptional<z.ZodNumber>;
        maxItems: z.ZodOptional<z.ZodNumber>;
        default: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodNumber>, z.ZodArray<z.ZodBoolean>]>>;
    }, z.core.$strip>]>>]>>;
    consts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodObject<{}, z.core.$strip>, z.ZodArray<z.ZodAny>]>>>;
    steps: z.ZodArray<z.ZodLazy<z.ZodUnion<readonly [z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
            limit: z.ZodNumber;
            'on-limit': z.ZodEnum<{
                continue: "continue";
                fail: "fail";
            }>;
        }, z.core.$strip>]>>;
        'iteration-timeout': z.ZodOptional<z.ZodString>;
        'iteration-on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        foreach: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        type: z.ZodLiteral<"foreach">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
            limit: z.ZodNumber;
            'on-limit': z.ZodEnum<{
                continue: "continue";
                fail: "fail";
            }>;
        }, z.core.$strip>]>>;
        'iteration-timeout': z.ZodOptional<z.ZodString>;
        'iteration-on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        condition: z.ZodString;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        type: z.ZodLiteral<"while">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        condition: z.ZodString;
        if: z.ZodOptional<z.ZodNever>;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        else: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"if">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        expression: z.ZodString;
        cases: z.ZodArray<z.ZodObject<{
            match: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>;
            steps: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        default: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"switch">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"wait">;
        with: z.ZodObject<{
            duration: z.ZodUnion<readonly [z.ZodString, z.ZodString]>;
        }, z.core.$strip>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        type: z.ZodLiteral<"waitForInput">;
        with: z.ZodOptional<z.ZodObject<{
            message: z.ZodOptional<z.ZodString>;
            schema: z.ZodOptional<z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"object">>;
                title: z.ZodOptional<z.ZodString>;
                description: z.ZodOptional<z.ZodString>;
                $ref: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                    [x: string]: string;
                }>, z.ZodString]>>;
                properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
                additionalProperties: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>]>>;
                required: z.ZodOptional<z.ZodArray<z.ZodString>>;
                definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
                $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
            }, z.core.$strip>>;
            channels: z.ZodOptional<z.ZodObject<{
                slack: z.ZodOptional<z.ZodObject<{
                    'connector-id': z.ZodString;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                slack_api: z.ZodOptional<z.ZodObject<{
                    'connector-id': z.ZodString;
                    channels: z.ZodArray<z.ZodString>;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        type: z.ZodLiteral<"waitForApproval">;
        with: z.ZodOptional<z.ZodObject<{
            message: z.ZodOptional<z.ZodString>;
            approveLabel: z.ZodOptional<z.ZodString>;
            rejectLabel: z.ZodOptional<z.ZodString>;
            channels: z.ZodOptional<z.ZodObject<{
                slack: z.ZodOptional<z.ZodObject<{
                    'connector-id': z.ZodString;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                slack_api: z.ZodOptional<z.ZodObject<{
                    'connector-id': z.ZodString;
                    channels: z.ZodArray<z.ZodString>;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"data.set">;
        with: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        with: z.ZodUnion<readonly [z.ZodObject<{
            request: z.ZodObject<{
                method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                    DELETE: "DELETE";
                    GET: "GET";
                    HEAD: "HEAD";
                    PATCH: "PATCH";
                    POST: "POST";
                    PUT: "PUT";
                }>>>;
                path: z.ZodString;
                body: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>;
        }, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
            index: z.ZodOptional<z.ZodString>;
            id: z.ZodOptional<z.ZodString>;
            query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            size: z.ZodOptional<z.ZodNumber>;
            from: z.ZodOptional<z.ZodNumber>;
            sort: z.ZodOptional<z.ZodArray<z.ZodAny>>;
            _source: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodArray<z.ZodString>, z.ZodString]>>;
            aggs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            aggregations: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>>]>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        with: z.ZodUnion<readonly [z.ZodObject<{
            use_server_info: z.ZodOptional<z.ZodBoolean>;
            use_localhost: z.ZodOptional<z.ZodBoolean>;
            debug: z.ZodOptional<z.ZodBoolean>;
            request: z.ZodObject<{
                method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                    DELETE: "DELETE";
                    GET: "GET";
                    PATCH: "PATCH";
                    POST: "POST";
                    PUT: "PUT";
                }>>>;
                path: z.ZodString;
                body: z.ZodOptional<z.ZodAny>;
                headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            }, z.core.$strip>;
            fetcher: z.ZodOptional<z.ZodObject<{
                skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
                follow_redirects: z.ZodOptional<z.ZodBoolean>;
                max_redirects: z.ZodOptional<z.ZodNumber>;
                keep_alive: z.ZodOptional<z.ZodBoolean>;
                max_content_length: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
            use_server_info: z.ZodOptional<z.ZodBoolean>;
            use_localhost: z.ZodOptional<z.ZodBoolean>;
            debug: z.ZodOptional<z.ZodBoolean>;
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            severity: z.ZodOptional<z.ZodEnum<{
                critical: "critical";
                high: "high";
                low: "low";
                medium: "medium";
            }>>;
            assignees: z.ZodOptional<z.ZodArray<z.ZodString>>;
            owner: z.ZodOptional<z.ZodString>;
            connector: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            id: z.ZodOptional<z.ZodString>;
            case_id: z.ZodOptional<z.ZodString>;
            space_id: z.ZodOptional<z.ZodString>;
            page: z.ZodOptional<z.ZodNumber>;
            perPage: z.ZodOptional<z.ZodNumber>;
            status: z.ZodOptional<z.ZodString>;
            fetcher: z.ZodOptional<z.ZodObject<{
                skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
                follow_redirects: z.ZodOptional<z.ZodBoolean>;
                max_redirects: z.ZodOptional<z.ZodNumber>;
                keep_alive: z.ZodOptional<z.ZodBoolean>;
                max_content_length: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>>]>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
        steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        branches: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            steps: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
        concurrency: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
            max: z.ZodOptional<z.ZodNumber>;
            'count-waiting': z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>]>>;
        mode: z.ZodOptional<z.ZodEnum<{
            "fail-fast": "fail-fast";
            settled: "settled";
        }>>;
        'branch-timeout': z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"parallel">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        sources: z.ZodArray<z.ZodString>;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        type: z.ZodLiteral<"merge">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        with: z.ZodObject<{
            'workflow-id': z.ZodString;
            inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
        type: z.ZodLiteral<"workflow.execute">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        with: z.ZodObject<{
            'workflow-id': z.ZodString;
            inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
        type: z.ZodLiteral<"workflow.executeAsync">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"workflow.output">;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            cancelled: "cancelled";
            completed: "completed";
            failed: "failed";
        }>>>;
        with: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"workflow.fail">;
        with: z.ZodOptional<z.ZodObject<{
            message: z.ZodOptional<z.ZodString>;
            reason: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"loop.break">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"loop.continue">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
        foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        type: z.ZodString;
        with: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>]>>>;
}, z.core.$strip>;
export declare const WorkflowSchema: z.ZodPipe<z.ZodObject<{
    version: z.ZodDefault<z.ZodOptional<z.ZodLiteral<"1">>>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    settings: z.ZodOptional<z.ZodObject<{
        run_as: z.ZodOptional<z.ZodString>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        timezone: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        concurrency: z.ZodOptional<z.ZodObject<{
            key: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                "cancel-in-progress": "cancel-in-progress";
                drop: "drop";
                queue: "queue";
            }>>;
            max: z.ZodOptional<z.ZodNumber>;
            'queue-size': z.ZodOptional<z.ZodNumber>;
            'queue-ttl': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        'max-step-size': z.ZodOptional<z.ZodString>;
        liquid: z.ZodOptional<z.ZodObject<{
            parseLimit: z.ZodOptional<z.ZodNumber>;
            renderLimit: z.ZodOptional<z.ZodNumber>;
            memoryLimit: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    outputs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodOptional<z.ZodLiteral<"object">>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        $ref: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            [x: string]: string;
        }>, z.ZodString]>>;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        additionalProperties: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>]>>;
        required: z.ZodOptional<z.ZodArray<z.ZodString>>;
        definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
    }, z.core.$strip>, z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        type: z.ZodLiteral<"string">;
        default: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        type: z.ZodLiteral<"number">;
        default: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        type: z.ZodLiteral<"boolean">;
        default: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        type: z.ZodLiteral<"choice">;
        default: z.ZodOptional<z.ZodString>;
        options: z.ZodArray<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        type: z.ZodLiteral<"array">;
        minItems: z.ZodOptional<z.ZodNumber>;
        maxItems: z.ZodOptional<z.ZodNumber>;
        default: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodNumber>, z.ZodArray<z.ZodBoolean>]>>;
    }, z.core.$strip>]>>]>>;
    consts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodObject<{}, z.core.$strip>, z.ZodArray<z.ZodAny>]>>>;
    steps: z.ZodArray<z.ZodLazy<z.ZodUnion<readonly [z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
            limit: z.ZodNumber;
            'on-limit': z.ZodEnum<{
                continue: "continue";
                fail: "fail";
            }>;
        }, z.core.$strip>]>>;
        'iteration-timeout': z.ZodOptional<z.ZodString>;
        'iteration-on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        foreach: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        type: z.ZodLiteral<"foreach">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        'max-iterations': z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
            limit: z.ZodNumber;
            'on-limit': z.ZodEnum<{
                continue: "continue";
                fail: "fail";
            }>;
        }, z.core.$strip>]>>;
        'iteration-timeout': z.ZodOptional<z.ZodString>;
        'iteration-on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        condition: z.ZodString;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        type: z.ZodLiteral<"while">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        condition: z.ZodString;
        if: z.ZodOptional<z.ZodNever>;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        else: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"if">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        expression: z.ZodString;
        cases: z.ZodArray<z.ZodObject<{
            match: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>;
            steps: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        default: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"switch">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"wait">;
        with: z.ZodObject<{
            duration: z.ZodUnion<readonly [z.ZodString, z.ZodString]>;
        }, z.core.$strip>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        type: z.ZodLiteral<"waitForInput">;
        with: z.ZodOptional<z.ZodObject<{
            message: z.ZodOptional<z.ZodString>;
            schema: z.ZodOptional<z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"object">>;
                title: z.ZodOptional<z.ZodString>;
                description: z.ZodOptional<z.ZodString>;
                $ref: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                    [x: string]: string;
                }>, z.ZodString]>>;
                properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
                additionalProperties: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>]>>;
                required: z.ZodOptional<z.ZodArray<z.ZodString>>;
                definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
                $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
            }, z.core.$strip>>;
            channels: z.ZodOptional<z.ZodObject<{
                slack: z.ZodOptional<z.ZodObject<{
                    'connector-id': z.ZodString;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                slack_api: z.ZodOptional<z.ZodObject<{
                    'connector-id': z.ZodString;
                    channels: z.ZodArray<z.ZodString>;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        type: z.ZodLiteral<"waitForApproval">;
        with: z.ZodOptional<z.ZodObject<{
            message: z.ZodOptional<z.ZodString>;
            approveLabel: z.ZodOptional<z.ZodString>;
            rejectLabel: z.ZodOptional<z.ZodString>;
            channels: z.ZodOptional<z.ZodObject<{
                slack: z.ZodOptional<z.ZodObject<{
                    'connector-id': z.ZodString;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
                slack_api: z.ZodOptional<z.ZodObject<{
                    'connector-id': z.ZodString;
                    channels: z.ZodArray<z.ZodString>;
                    message: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"data.set">;
        with: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        with: z.ZodUnion<readonly [z.ZodObject<{
            request: z.ZodObject<{
                method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                    DELETE: "DELETE";
                    GET: "GET";
                    HEAD: "HEAD";
                    PATCH: "PATCH";
                    POST: "POST";
                    PUT: "PUT";
                }>>>;
                path: z.ZodString;
                body: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>;
        }, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
            index: z.ZodOptional<z.ZodString>;
            id: z.ZodOptional<z.ZodString>;
            query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            size: z.ZodOptional<z.ZodNumber>;
            from: z.ZodOptional<z.ZodNumber>;
            sort: z.ZodOptional<z.ZodArray<z.ZodAny>>;
            _source: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodArray<z.ZodString>, z.ZodString]>>;
            aggs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            aggregations: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>>]>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        with: z.ZodUnion<readonly [z.ZodObject<{
            use_server_info: z.ZodOptional<z.ZodBoolean>;
            use_localhost: z.ZodOptional<z.ZodBoolean>;
            debug: z.ZodOptional<z.ZodBoolean>;
            request: z.ZodObject<{
                method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                    DELETE: "DELETE";
                    GET: "GET";
                    PATCH: "PATCH";
                    POST: "POST";
                    PUT: "PUT";
                }>>>;
                path: z.ZodString;
                body: z.ZodOptional<z.ZodAny>;
                headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            }, z.core.$strip>;
            fetcher: z.ZodOptional<z.ZodObject<{
                skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
                follow_redirects: z.ZodOptional<z.ZodBoolean>;
                max_redirects: z.ZodOptional<z.ZodNumber>;
                keep_alive: z.ZodOptional<z.ZodBoolean>;
                max_content_length: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
            use_server_info: z.ZodOptional<z.ZodBoolean>;
            use_localhost: z.ZodOptional<z.ZodBoolean>;
            debug: z.ZodOptional<z.ZodBoolean>;
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            severity: z.ZodOptional<z.ZodEnum<{
                critical: "critical";
                high: "high";
                low: "low";
                medium: "medium";
            }>>;
            assignees: z.ZodOptional<z.ZodArray<z.ZodString>>;
            owner: z.ZodOptional<z.ZodString>;
            connector: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            id: z.ZodOptional<z.ZodString>;
            case_id: z.ZodOptional<z.ZodString>;
            space_id: z.ZodOptional<z.ZodString>;
            page: z.ZodOptional<z.ZodNumber>;
            perPage: z.ZodOptional<z.ZodNumber>;
            status: z.ZodOptional<z.ZodString>;
            fetcher: z.ZodOptional<z.ZodObject<{
                skip_ssl_verification: z.ZodOptional<z.ZodBoolean>;
                follow_redirects: z.ZodOptional<z.ZodBoolean>;
                max_redirects: z.ZodOptional<z.ZodNumber>;
                keep_alive: z.ZodOptional<z.ZodBoolean>;
                max_content_length: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>>]>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
        steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        branches: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            steps: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
        concurrency: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
            max: z.ZodOptional<z.ZodNumber>;
            'count-waiting': z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>]>>;
        mode: z.ZodOptional<z.ZodEnum<{
            "fail-fast": "fail-fast";
            settled: "settled";
        }>>;
        'branch-timeout': z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"parallel">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        sources: z.ZodArray<z.ZodString>;
        steps: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            'max-step-size': z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        type: z.ZodLiteral<"merge">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        with: z.ZodObject<{
            'workflow-id': z.ZodString;
            inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
        type: z.ZodLiteral<"workflow.execute">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        with: z.ZodObject<{
            'workflow-id': z.ZodString;
            inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
        type: z.ZodLiteral<"workflow.executeAsync">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"workflow.output">;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            cancelled: "cancelled";
            completed: "completed";
            failed: "failed";
        }>>>;
        with: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"workflow.fail">;
        with: z.ZodOptional<z.ZodObject<{
            message: z.ZodOptional<z.ZodString>;
            reason: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"loop.break">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"loop.continue">;
    }, z.core.$strip>, z.ZodObject<{
        name: z.ZodString;
        'max-step-size': z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>;
        foreach: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodUnknown>]>>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        type: z.ZodString;
        with: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>]>>>;
    triggers: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"alert">;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"scheduled">;
        with: z.ZodUnion<readonly [z.ZodObject<{
            every: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            rrule: z.ZodObject<{
                freq: z.ZodEnum<{
                    DAILY: "DAILY";
                    MONTHLY: "MONTHLY";
                    WEEKLY: "WEEKLY";
                }>;
                interval: z.ZodNumber;
                tzid: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                    [x: string]: string;
                }>>>;
                dtstart: z.ZodOptional<z.ZodString>;
                byhour: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
                byminute: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
                byweekday: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    FR: "FR";
                    MO: "MO";
                    SA: "SA";
                    SU: "SU";
                    TH: "TH";
                    TU: "TU";
                    WE: "WE";
                }>>>;
                bymonthday: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
            }, z.core.$strip>;
        }, z.core.$strip>]>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"manual">;
        inputs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodOptional<z.ZodLiteral<"object">>;
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            $ref: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                [x: string]: string;
            }>, z.ZodString]>>;
            properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
            additionalProperties: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>]>>;
            required: z.ZodOptional<z.ZodArray<z.ZodString>>;
            definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
            $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        }, z.core.$strip>, z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"string">;
            default: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"number">;
            default: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"boolean">;
            default: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"choice">;
            default: z.ZodOptional<z.ZodString>;
            options: z.ZodArray<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            type: z.ZodLiteral<"array">;
            minItems: z.ZodOptional<z.ZodNumber>;
            maxItems: z.ZodOptional<z.ZodNumber>;
            default: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodNumber>, z.ZodArray<z.ZodBoolean>]>>;
        }, z.core.$strip>]>>]>>;
    }, z.core.$strip>], "type">>;
}, z.core.$strip>, z.ZodTransform<{
    version: "1";
    name: string;
    description?: string | undefined;
    settings?: {
        run_as?: string | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        timezone?: string | undefined;
        timeout?: string | undefined;
        concurrency?: {
            key?: string | undefined;
            strategy?: "cancel-in-progress" | "drop" | "queue" | undefined;
            max?: number | undefined;
            'queue-size'?: number | undefined;
            'queue-ttl'?: string | undefined;
        } | undefined;
        'max-step-size'?: string | undefined;
        liquid?: {
            parseLimit?: number | undefined;
            renderLimit?: number | undefined;
            memoryLimit?: number | undefined;
        } | undefined;
    } | undefined;
    enabled: boolean;
    tags?: string[] | undefined;
    consts?: Record<string, string | number | boolean | any[] | Record<string, any> | Record<string, never>> | undefined;
    steps: ({
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        foreach?: string | unknown[] | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        type: string;
        with?: Record<string, any> | undefined;
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: "wait";
        with: {
            duration: string;
        };
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        type: "waitForInput";
        with?: {
            message?: string | undefined;
            schema?: {
                type?: "object" | undefined;
                title?: string | undefined;
                description?: string | undefined;
                $ref?: string | undefined;
                properties?: Record<string, import("..").JsonSchema> | undefined;
                additionalProperties?: boolean | import("..").JsonSchema | undefined;
                required?: string[] | undefined;
                definitions?: Record<string, import("..").JsonSchema> | undefined;
                $defs?: Record<string, import("..").JsonSchema> | undefined;
            } | undefined;
            channels?: {
                slack?: {
                    'connector-id': string;
                    message?: string | undefined;
                } | undefined;
                slack_api?: {
                    'connector-id': string;
                    channels: string[];
                    message?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        type: "waitForApproval";
        with?: {
            message?: string | undefined;
            approveLabel?: string | undefined;
            rejectLabel?: string | undefined;
            channels?: {
                slack?: {
                    'connector-id': string;
                    message?: string | undefined;
                } | undefined;
                slack_api?: {
                    'connector-id': string;
                    channels: string[];
                    message?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: "data.set";
        with: Record<string, unknown>;
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: string;
        with: {
            request: {
                method: "DELETE" | "GET" | "HEAD" | "PATCH" | "POST" | "PUT";
                path: string;
                body?: any;
            };
        } | ({
            index?: string | undefined;
            id?: string | undefined;
            query?: Record<string, any> | undefined;
            body?: Record<string, any> | undefined;
            size?: number | undefined;
            from?: number | undefined;
            sort?: any[] | undefined;
            _source?: string | boolean | string[] | undefined;
            aggs?: Record<string, any> | undefined;
            aggregations?: Record<string, any> | undefined;
        } & Record<string, any>);
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: string;
        with: {
            use_server_info?: boolean | undefined;
            use_localhost?: boolean | undefined;
            debug?: boolean | undefined;
            request: {
                method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
                path: string;
                body?: any;
                headers?: Record<string, string> | undefined;
            };
            fetcher?: {
                skip_ssl_verification?: boolean | undefined;
                follow_redirects?: boolean | undefined;
                max_redirects?: number | undefined;
                keep_alive?: boolean | undefined;
                max_content_length?: number | undefined;
            } | undefined;
        } | ({
            use_server_info?: boolean | undefined;
            use_localhost?: boolean | undefined;
            debug?: boolean | undefined;
            title?: string | undefined;
            description?: string | undefined;
            tags?: string[] | undefined;
            severity?: "critical" | "high" | "low" | "medium" | undefined;
            assignees?: string[] | undefined;
            owner?: string | undefined;
            connector?: Record<string, any> | undefined;
            settings?: Record<string, any> | undefined;
            id?: string | undefined;
            case_id?: string | undefined;
            space_id?: string | undefined;
            page?: number | undefined;
            perPage?: number | undefined;
            status?: string | undefined;
            fetcher?: {
                skip_ssl_verification?: boolean | undefined;
                follow_redirects?: boolean | undefined;
                max_redirects?: number | undefined;
                keep_alive?: boolean | undefined;
                max_content_length?: number | undefined;
            } | undefined;
        } & Record<string, any>);
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        'max-iterations'?: number | {
            limit: number;
            'on-limit': "continue" | "fail";
        } | undefined;
        'iteration-timeout'?: string | undefined;
        'iteration-on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        foreach: string | unknown[];
        steps: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[];
        type: "foreach";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        'max-iterations'?: number | {
            limit: number;
            'on-limit': "continue" | "fail";
        } | undefined;
        'iteration-timeout'?: string | undefined;
        'iteration-on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        condition: string;
        steps: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[];
        type: "while";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        expression: string;
        cases: {
            match: string | number | boolean;
            steps: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[];
        }[];
        default?: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[] | undefined;
        type: "switch";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        condition: string;
        if?: undefined;
        steps: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[];
        else?: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[] | undefined;
        type: "if";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        foreach?: string | unknown[] | undefined;
        steps?: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[] | undefined;
        branches?: {
            name: string;
            steps: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[];
        }[] | undefined;
        concurrency?: number | {
            max?: number | undefined;
            'count-waiting'?: boolean | undefined;
        } | undefined;
        mode?: "fail-fast" | "settled" | undefined;
        'branch-timeout'?: string | undefined;
        type: "parallel";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        sources: string[];
        steps: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[];
        type: "merge";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: "loop.break";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: "loop.continue";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        with: {
            'workflow-id': string;
            inputs?: Record<string, unknown> | undefined;
        };
        type: "workflow.execute";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        with: {
            'workflow-id': string;
            inputs?: Record<string, unknown> | undefined;
        };
        type: "workflow.executeAsync";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: "workflow.output";
        status: "cancelled" | "completed" | "failed";
        with: Record<string, any>;
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: "workflow.fail";
        with?: {
            message?: string | undefined;
            reason?: string | undefined;
        } | undefined;
    })[];
    outputs?: {
        type?: "object" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        $ref?: string | undefined;
        properties?: Record<string, import("..").JsonSchema> | undefined;
        additionalProperties?: boolean | import("..").JsonSchema | undefined;
        required?: string[] | undefined;
        definitions?: Record<string, import("..").JsonSchema> | undefined;
        $defs?: Record<string, import("..").JsonSchema> | undefined;
    } | undefined;
    triggers: ({
        type: "alert";
    } | {
        type: "scheduled";
        with: {
            every: string;
        } | {
            rrule: {
                freq: "DAILY" | "MONTHLY" | "WEEKLY";
                interval: number;
                tzid: string;
                dtstart?: string | undefined;
                byhour?: number[] | undefined;
                byminute?: number[] | undefined;
                byweekday?: ("FR" | "MO" | "SA" | "SU" | "TH" | "TU" | "WE")[] | undefined;
                bymonthday?: number[] | undefined;
            };
        };
    } | {
        type: "manual";
        inputs?: ({
            name: string;
            description?: string | undefined;
            required?: boolean | undefined;
            type: "string";
            default?: string | undefined;
        } | {
            name: string;
            description?: string | undefined;
            required?: boolean | undefined;
            type: "number";
            default?: number | undefined;
        } | {
            name: string;
            description?: string | undefined;
            required?: boolean | undefined;
            type: "boolean";
            default?: boolean | undefined;
        } | {
            name: string;
            description?: string | undefined;
            required?: boolean | undefined;
            type: "choice";
            default?: string | undefined;
            options: string[];
        } | {
            name: string;
            description?: string | undefined;
            required?: boolean | undefined;
            type: "array";
            minItems?: number | undefined;
            maxItems?: number | undefined;
            default?: string[] | number[] | boolean[] | undefined;
        })[] | {
            type?: "object" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            $ref?: string | undefined;
            properties?: Record<string, import("..").JsonSchema> | undefined;
            additionalProperties?: boolean | import("..").JsonSchema | undefined;
            required?: string[] | undefined;
            definitions?: Record<string, import("..").JsonSchema> | undefined;
            $defs?: Record<string, import("..").JsonSchema> | undefined;
        } | undefined;
    })[];
}, {
    version: "1";
    name: string;
    description?: string | undefined;
    settings?: {
        run_as?: string | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        timezone?: string | undefined;
        timeout?: string | undefined;
        concurrency?: {
            key?: string | undefined;
            strategy?: "cancel-in-progress" | "drop" | "queue" | undefined;
            max?: number | undefined;
            'queue-size'?: number | undefined;
            'queue-ttl'?: string | undefined;
        } | undefined;
        'max-step-size'?: string | undefined;
        liquid?: {
            parseLimit?: number | undefined;
            renderLimit?: number | undefined;
            memoryLimit?: number | undefined;
        } | undefined;
    } | undefined;
    enabled: boolean;
    tags?: string[] | undefined;
    outputs?: ({
        name: string;
        description?: string | undefined;
        required?: boolean | undefined;
        type: "string";
        default?: string | undefined;
    } | {
        name: string;
        description?: string | undefined;
        required?: boolean | undefined;
        type: "number";
        default?: number | undefined;
    } | {
        name: string;
        description?: string | undefined;
        required?: boolean | undefined;
        type: "boolean";
        default?: boolean | undefined;
    } | {
        name: string;
        description?: string | undefined;
        required?: boolean | undefined;
        type: "choice";
        default?: string | undefined;
        options: string[];
    } | {
        name: string;
        description?: string | undefined;
        required?: boolean | undefined;
        type: "array";
        minItems?: number | undefined;
        maxItems?: number | undefined;
        default?: string[] | number[] | boolean[] | undefined;
    })[] | {
        type?: "object" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        $ref?: string | undefined;
        properties?: Record<string, import("..").JsonSchema> | undefined;
        additionalProperties?: boolean | import("..").JsonSchema | undefined;
        required?: string[] | undefined;
        definitions?: Record<string, import("..").JsonSchema> | undefined;
        $defs?: Record<string, import("..").JsonSchema> | undefined;
    } | undefined;
    consts?: Record<string, string | number | boolean | any[] | Record<string, any> | Record<string, never>> | undefined;
    steps: ({
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        foreach?: string | unknown[] | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        type: string;
        with?: Record<string, any> | undefined;
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: "wait";
        with: {
            duration: string;
        };
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        type: "waitForInput";
        with?: {
            message?: string | undefined;
            schema?: {
                type?: "object" | undefined;
                title?: string | undefined;
                description?: string | undefined;
                $ref?: string | undefined;
                properties?: Record<string, import("..").JsonSchema> | undefined;
                additionalProperties?: boolean | import("..").JsonSchema | undefined;
                required?: string[] | undefined;
                definitions?: Record<string, import("..").JsonSchema> | undefined;
                $defs?: Record<string, import("..").JsonSchema> | undefined;
            } | undefined;
            channels?: {
                slack?: {
                    'connector-id': string;
                    message?: string | undefined;
                } | undefined;
                slack_api?: {
                    'connector-id': string;
                    channels: string[];
                    message?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        type: "waitForApproval";
        with?: {
            message?: string | undefined;
            approveLabel?: string | undefined;
            rejectLabel?: string | undefined;
            channels?: {
                slack?: {
                    'connector-id': string;
                    message?: string | undefined;
                } | undefined;
                slack_api?: {
                    'connector-id': string;
                    channels: string[];
                    message?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: "data.set";
        with: Record<string, unknown>;
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: string;
        with: {
            request: {
                method: "DELETE" | "GET" | "HEAD" | "PATCH" | "POST" | "PUT";
                path: string;
                body?: any;
            };
        } | ({
            index?: string | undefined;
            id?: string | undefined;
            query?: Record<string, any> | undefined;
            body?: Record<string, any> | undefined;
            size?: number | undefined;
            from?: number | undefined;
            sort?: any[] | undefined;
            _source?: string | boolean | string[] | undefined;
            aggs?: Record<string, any> | undefined;
            aggregations?: Record<string, any> | undefined;
        } & Record<string, any>);
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: string;
        with: {
            use_server_info?: boolean | undefined;
            use_localhost?: boolean | undefined;
            debug?: boolean | undefined;
            request: {
                method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
                path: string;
                body?: any;
                headers?: Record<string, string> | undefined;
            };
            fetcher?: {
                skip_ssl_verification?: boolean | undefined;
                follow_redirects?: boolean | undefined;
                max_redirects?: number | undefined;
                keep_alive?: boolean | undefined;
                max_content_length?: number | undefined;
            } | undefined;
        } | ({
            use_server_info?: boolean | undefined;
            use_localhost?: boolean | undefined;
            debug?: boolean | undefined;
            title?: string | undefined;
            description?: string | undefined;
            tags?: string[] | undefined;
            severity?: "critical" | "high" | "low" | "medium" | undefined;
            assignees?: string[] | undefined;
            owner?: string | undefined;
            connector?: Record<string, any> | undefined;
            settings?: Record<string, any> | undefined;
            id?: string | undefined;
            case_id?: string | undefined;
            space_id?: string | undefined;
            page?: number | undefined;
            perPage?: number | undefined;
            status?: string | undefined;
            fetcher?: {
                skip_ssl_verification?: boolean | undefined;
                follow_redirects?: boolean | undefined;
                max_redirects?: number | undefined;
                keep_alive?: boolean | undefined;
                max_content_length?: number | undefined;
            } | undefined;
        } & Record<string, any>);
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        'max-iterations'?: number | {
            limit: number;
            'on-limit': "continue" | "fail";
        } | undefined;
        'iteration-timeout'?: string | undefined;
        'iteration-on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        foreach: string | unknown[];
        steps: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[];
        type: "foreach";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        'max-iterations'?: number | {
            limit: number;
            'on-limit': "continue" | "fail";
        } | undefined;
        'iteration-timeout'?: string | undefined;
        'iteration-on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        condition: string;
        steps: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[];
        type: "while";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        expression: string;
        cases: {
            match: string | number | boolean;
            steps: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[];
        }[];
        default?: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[] | undefined;
        type: "switch";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        condition: string;
        if?: undefined;
        steps: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[];
        else?: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[] | undefined;
        type: "if";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        timeout?: string | undefined;
        foreach?: string | unknown[] | undefined;
        steps?: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[] | undefined;
        branches?: {
            name: string;
            steps: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[];
        }[] | undefined;
        concurrency?: number | {
            max?: number | undefined;
            'count-waiting'?: boolean | undefined;
        } | undefined;
        mode?: "fail-fast" | "settled" | undefined;
        'branch-timeout'?: string | undefined;
        type: "parallel";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        sources: string[];
        steps: {
            name: string;
            type: string;
            'max-step-size'?: string | undefined;
            if?: string | undefined;
        }[];
        type: "merge";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: "loop.break";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: "loop.continue";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        with: {
            'workflow-id': string;
            inputs?: Record<string, unknown> | undefined;
        };
        type: "workflow.execute";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        with: {
            'workflow-id': string;
            inputs?: Record<string, unknown> | undefined;
        };
        type: "workflow.executeAsync";
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: "workflow.output";
        status: "cancelled" | "completed" | "failed";
        with: Record<string, any>;
    } | {
        name: string;
        'max-step-size'?: string | undefined;
        if?: string | undefined;
        type: "workflow.fail";
        with?: {
            message?: string | undefined;
            reason?: string | undefined;
        } | undefined;
    })[];
    triggers: ({
        type: "alert";
    } | {
        type: "scheduled";
        with: {
            every: string;
        } | {
            rrule: {
                freq: "DAILY" | "MONTHLY" | "WEEKLY";
                interval: number;
                tzid: string;
                dtstart?: string | undefined;
                byhour?: number[] | undefined;
                byminute?: number[] | undefined;
                byweekday?: ("FR" | "MO" | "SA" | "SU" | "TH" | "TU" | "WE")[] | undefined;
                bymonthday?: number[] | undefined;
            };
        };
    } | {
        type: "manual";
        inputs?: ({
            name: string;
            description?: string | undefined;
            required?: boolean | undefined;
            type: "string";
            default?: string | undefined;
        } | {
            name: string;
            description?: string | undefined;
            required?: boolean | undefined;
            type: "number";
            default?: number | undefined;
        } | {
            name: string;
            description?: string | undefined;
            required?: boolean | undefined;
            type: "boolean";
            default?: boolean | undefined;
        } | {
            name: string;
            description?: string | undefined;
            required?: boolean | undefined;
            type: "choice";
            default?: string | undefined;
            options: string[];
        } | {
            name: string;
            description?: string | undefined;
            required?: boolean | undefined;
            type: "array";
            minItems?: number | undefined;
            maxItems?: number | undefined;
            default?: string[] | number[] | boolean[] | undefined;
        })[] | {
            type?: "object" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            $ref?: string | undefined;
            properties?: Record<string, import("..").JsonSchema> | undefined;
            additionalProperties?: boolean | import("..").JsonSchema | undefined;
            required?: string[] | undefined;
            definitions?: Record<string, import("..").JsonSchema> | undefined;
            $defs?: Record<string, import("..").JsonSchema> | undefined;
        } | undefined;
    })[];
}>>;
export { WorkflowSchemaBase };
export type WorkflowYaml = z.infer<typeof WorkflowSchema>;
declare const WorkflowSchemaForAutocompleteBase: z.ZodObject<{
    version: z.ZodOptional<z.ZodLiteral<"1">>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    settings: z.ZodOptional<z.ZodObject<{
        run_as: z.ZodOptional<z.ZodString>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        timezone: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        concurrency: z.ZodOptional<z.ZodObject<{
            key: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                "cancel-in-progress": "cancel-in-progress";
                drop: "drop";
                queue: "queue";
            }>>;
            max: z.ZodOptional<z.ZodNumber>;
            'queue-size': z.ZodOptional<z.ZodNumber>;
            'queue-ttl': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        'max-step-size': z.ZodOptional<z.ZodString>;
        liquid: z.ZodOptional<z.ZodObject<{
            parseLimit: z.ZodOptional<z.ZodNumber>;
            renderLimit: z.ZodOptional<z.ZodNumber>;
            memoryLimit: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    triggers: z.ZodDefault<z.ZodCatch<z.ZodArray<z.ZodObject<{
        type: z.ZodCatch<z.ZodString>;
    }, z.core.$loose>>>>;
    outputs: z.ZodCatch<z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodOptional<z.ZodLiteral<"object">>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        $ref: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            [x: string]: string;
        }>, z.ZodString]>>;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        additionalProperties: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>]>>;
        required: z.ZodOptional<z.ZodArray<z.ZodString>>;
        definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
    }, z.core.$strip>, z.ZodArray<z.ZodObject<{
        name: z.ZodCatch<z.ZodString>;
        type: z.ZodCatch<z.ZodString>;
    }, z.core.$loose>>]>>>;
    consts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodObject<{}, z.core.$strip>, z.ZodArray<z.ZodAny>]>>>;
    steps: z.ZodDefault<z.ZodCatch<z.ZodArray<z.ZodObject<{
        type: z.ZodCatch<z.ZodString>;
        name: z.ZodCatch<z.ZodString>;
    }, z.core.$loose>>>>;
}, z.core.$loose>;
export declare const WorkflowSchemaForAutocomplete: z.ZodPipe<z.ZodObject<{
    version: z.ZodOptional<z.ZodLiteral<"1">>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    settings: z.ZodOptional<z.ZodObject<{
        run_as: z.ZodOptional<z.ZodString>;
        'on-failure': z.ZodOptional<z.ZodObject<{
            retry: z.ZodOptional<z.ZodObject<{
                'max-attempts': z.ZodNumber;
                condition: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodString>;
                strategy: z.ZodOptional<z.ZodEnum<{
                    exponential: "exponential";
                    fixed: "fixed";
                }>>;
                multiplier: z.ZodOptional<z.ZodNumber>;
                'max-delay': z.ZodOptional<z.ZodString>;
                jitter: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            fallback: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodString;
                'max-step-size': z.ZodOptional<z.ZodString>;
                if: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            continue: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>;
        }, z.core.$strip>>;
        timezone: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodString>;
        concurrency: z.ZodOptional<z.ZodObject<{
            key: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodEnum<{
                "cancel-in-progress": "cancel-in-progress";
                drop: "drop";
                queue: "queue";
            }>>;
            max: z.ZodOptional<z.ZodNumber>;
            'queue-size': z.ZodOptional<z.ZodNumber>;
            'queue-ttl': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        'max-step-size': z.ZodOptional<z.ZodString>;
        liquid: z.ZodOptional<z.ZodObject<{
            parseLimit: z.ZodOptional<z.ZodNumber>;
            renderLimit: z.ZodOptional<z.ZodNumber>;
            memoryLimit: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    triggers: z.ZodDefault<z.ZodCatch<z.ZodArray<z.ZodObject<{
        type: z.ZodCatch<z.ZodString>;
    }, z.core.$loose>>>>;
    outputs: z.ZodCatch<z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodOptional<z.ZodLiteral<"object">>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        $ref: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            [x: string]: string;
        }>, z.ZodString]>>;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        additionalProperties: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>]>>;
        required: z.ZodOptional<z.ZodArray<z.ZodString>>;
        definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
        $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("..").JsonSchema, unknown, z.core.$ZodTypeInternals<import("..").JsonSchema, unknown>>>>;
    }, z.core.$strip>, z.ZodArray<z.ZodObject<{
        name: z.ZodCatch<z.ZodString>;
        type: z.ZodCatch<z.ZodString>;
    }, z.core.$loose>>]>>>;
    consts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodObject<{}, z.core.$strip>, z.ZodArray<z.ZodAny>]>>>;
    steps: z.ZodDefault<z.ZodCatch<z.ZodArray<z.ZodObject<{
        type: z.ZodCatch<z.ZodString>;
        name: z.ZodCatch<z.ZodString>;
    }, z.core.$loose>>>>;
}, z.core.$loose>, z.ZodTransform<{
    name?: string | undefined;
    description?: string | undefined;
    settings?: {
        run_as?: string | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        timezone?: string | undefined;
        timeout?: string | undefined;
        concurrency?: {
            key?: string | undefined;
            strategy?: "cancel-in-progress" | "drop" | "queue" | undefined;
            max?: number | undefined;
            'queue-size'?: number | undefined;
            'queue-ttl'?: string | undefined;
        } | undefined;
        'max-step-size'?: string | undefined;
        liquid?: {
            parseLimit?: number | undefined;
            renderLimit?: number | undefined;
            memoryLimit?: number | undefined;
        } | undefined;
    } | undefined;
    enabled?: boolean | undefined;
    tags?: string[] | undefined;
    triggers: {
        [x: string]: unknown;
        type: string;
    }[];
    outputs?: {
        [x: string]: unknown;
        name: string;
        type: string;
    }[] | {
        type?: "object" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        $ref?: string | undefined;
        properties?: Record<string, import("..").JsonSchema> | undefined;
        additionalProperties?: boolean | import("..").JsonSchema | undefined;
        required?: string[] | undefined;
        definitions?: Record<string, import("..").JsonSchema> | undefined;
        $defs?: Record<string, import("..").JsonSchema> | undefined;
    } | undefined;
    consts?: Record<string, string | number | boolean | any[] | Record<string, any> | Record<string, never>> | undefined;
    steps: {
        [x: string]: unknown;
        type: string;
        name: string;
    }[];
    version: "1";
}, {
    [x: string]: unknown;
    version?: "1" | undefined;
    name?: string | undefined;
    description?: string | undefined;
    settings?: {
        run_as?: string | undefined;
        'on-failure'?: {
            retry?: {
                'max-attempts': number;
                condition?: string | undefined;
                delay?: string | undefined;
                strategy?: "exponential" | "fixed" | undefined;
                multiplier?: number | undefined;
                'max-delay'?: string | undefined;
                jitter?: boolean | undefined;
            } | undefined;
            fallback?: {
                name: string;
                type: string;
                'max-step-size'?: string | undefined;
                if?: string | undefined;
            }[] | undefined;
            continue?: string | boolean | undefined;
        } | undefined;
        timezone?: string | undefined;
        timeout?: string | undefined;
        concurrency?: {
            key?: string | undefined;
            strategy?: "cancel-in-progress" | "drop" | "queue" | undefined;
            max?: number | undefined;
            'queue-size'?: number | undefined;
            'queue-ttl'?: string | undefined;
        } | undefined;
        'max-step-size'?: string | undefined;
        liquid?: {
            parseLimit?: number | undefined;
            renderLimit?: number | undefined;
            memoryLimit?: number | undefined;
        } | undefined;
    } | undefined;
    enabled?: boolean | undefined;
    tags?: string[] | undefined;
    triggers: {
        [x: string]: unknown;
        type: string;
    }[];
    outputs?: {
        [x: string]: unknown;
        name: string;
        type: string;
    }[] | {
        type?: "object" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        $ref?: string | undefined;
        properties?: Record<string, import("..").JsonSchema> | undefined;
        additionalProperties?: boolean | import("..").JsonSchema | undefined;
        required?: string[] | undefined;
        definitions?: Record<string, import("..").JsonSchema> | undefined;
        $defs?: Record<string, import("..").JsonSchema> | undefined;
    } | undefined;
    consts?: Record<string, string | number | boolean | any[] | Record<string, any> | Record<string, never>> | undefined;
    steps: {
        [x: string]: unknown;
        type: string;
        name: string;
    }[];
}>>;
export { WorkflowSchemaForAutocompleteBase };
export declare const WorkflowTokenUsageSchema: z.ZodObject<{
    inputTokens: z.ZodNumber;
    outputTokens: z.ZodNumber;
    cachedTokens: z.ZodOptional<z.ZodNumber>;
    totalTokens: z.ZodNumber;
}, z.core.$strip>;
export declare const WorkflowStepTokenUsageSchema: z.ZodObject<{
    inputTokens: z.ZodNumber;
    outputTokens: z.ZodNumber;
    cachedTokens: z.ZodOptional<z.ZodNumber>;
    totalTokens: z.ZodNumber;
    stepId: z.ZodString;
    connectorId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const WorkflowExecutionContextSchema: z.ZodObject<{
    id: z.ZodString;
    isTestRun: z.ZodBoolean;
    startedAt: z.ZodDate;
    url: z.ZodString;
    executedBy: z.ZodOptional<z.ZodString>;
    effectiveIdentity: z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<"service_account">;
        id: z.ZodString;
    }, z.core.$strip>>;
    triggeredBy: z.ZodOptional<z.ZodString>;
    usage: z.ZodOptional<z.ZodObject<{
        inputTokens: z.ZodNumber;
        outputTokens: z.ZodNumber;
        cachedTokens: z.ZodOptional<z.ZodNumber>;
        totalTokens: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type WorkflowExecutionContext = z.infer<typeof WorkflowExecutionContextSchema>;
export declare const WorkflowDataContextSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    enabled: z.ZodBoolean;
    spaceId: z.ZodString;
    version: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type WorkflowDataContext = z.infer<typeof WorkflowDataContextSchema>;
/**
 * Timestamp injected by the platform for event-driven (custom) trigger events only.
 */
export declare const EventTimestampSchema: z.ZodObject<{
    timestamp: z.ZodString;
}, z.core.$strip>;
export declare const WorkflowHitlTemplateContextSchema: z.ZodObject<{
    externalFormLink: z.ZodOptional<z.ZodString>;
    externalQueryLink: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const WorkflowTemplatePersistedContextSchema: z.ZodObject<{
    hitl: z.ZodOptional<z.ZodObject<{
        externalFormLink: z.ZodOptional<z.ZodString>;
        externalQueryLink: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const WorkflowContextSchema: z.ZodObject<{
    context: z.ZodOptional<z.ZodObject<{
        hitl: z.ZodOptional<z.ZodObject<{
            externalFormLink: z.ZodOptional<z.ZodString>;
            externalQueryLink: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    event: z.ZodOptional<z.ZodObject<{
        alerts: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            _id: z.ZodString;
            _index: z.ZodString;
            kibana: z.ZodObject<{
                alert: z.ZodUnknown;
            }, z.core.$strip>;
            '@timestamp': z.ZodString;
        }, z.core.$strip>, z.ZodUnknown]>>;
        rule: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            tags: z.ZodArray<z.ZodString>;
            consumer: z.ZodString;
            producer: z.ZodString;
            ruleTypeId: z.ZodString;
        }, z.core.$strip>;
        params: z.ZodUnknown;
        spaceId: z.ZodString;
    }, z.core.$strip>>;
    execution: z.ZodObject<{
        id: z.ZodString;
        isTestRun: z.ZodBoolean;
        startedAt: z.ZodDate;
        url: z.ZodString;
        executedBy: z.ZodOptional<z.ZodString>;
        effectiveIdentity: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"service_account">;
            id: z.ZodString;
        }, z.core.$strip>>;
        triggeredBy: z.ZodOptional<z.ZodString>;
        usage: z.ZodOptional<z.ZodObject<{
            inputTokens: z.ZodNumber;
            outputTokens: z.ZodNumber;
            cachedTokens: z.ZodOptional<z.ZodNumber>;
            totalTokens: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    workflow: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        enabled: z.ZodBoolean;
        spaceId: z.ZodString;
        version: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    kibanaUrl: z.ZodString;
    output: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodNumber>, z.ZodArray<z.ZodBoolean>]>]>>>;
    consts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    now: z.ZodOptional<z.ZodDate>;
    parent: z.ZodOptional<z.ZodObject<{
        workflowId: z.ZodString;
        executionId: z.ZodString;
        depth: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type WorkflowContext = z.infer<typeof WorkflowContextSchema>;
export declare const DynamicWorkflowContextSchema: z.ZodObject<{
    context: z.ZodOptional<z.ZodObject<{
        hitl: z.ZodOptional<z.ZodObject<{
            externalFormLink: z.ZodOptional<z.ZodString>;
            externalQueryLink: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    execution: z.ZodObject<{
        id: z.ZodString;
        isTestRun: z.ZodBoolean;
        startedAt: z.ZodDate;
        url: z.ZodString;
        executedBy: z.ZodOptional<z.ZodString>;
        effectiveIdentity: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"service_account">;
            id: z.ZodString;
        }, z.core.$strip>>;
        triggeredBy: z.ZodOptional<z.ZodString>;
        usage: z.ZodOptional<z.ZodObject<{
            inputTokens: z.ZodNumber;
            outputTokens: z.ZodNumber;
            cachedTokens: z.ZodOptional<z.ZodNumber>;
            totalTokens: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    workflow: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        enabled: z.ZodBoolean;
        spaceId: z.ZodString;
        version: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    kibanaUrl: z.ZodString;
    now: z.ZodOptional<z.ZodDate>;
    parent: z.ZodOptional<z.ZodObject<{
        workflowId: z.ZodString;
        executionId: z.ZodString;
        depth: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    inputs: z.ZodObject<{}, z.core.$strip>;
    output: z.ZodObject<{}, z.core.$strip>;
    consts: z.ZodObject<{}, z.core.$strip>;
    event: z.ZodOptional<z.ZodObject<{
        spaceId: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type DynamicWorkflowContext = z.infer<typeof DynamicWorkflowContextSchema>;
export declare const StepDataSchema: z.ZodObject<{
    output: z.ZodOptional<z.ZodAny>;
    error: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>;
export type StepData = z.infer<typeof StepDataSchema>;
export declare const ForEachContextSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodUnknown>;
    index: z.ZodNumber;
    item: z.ZodUnknown;
    total: z.ZodNumber;
}, z.core.$strip>;
export type ForEachContext = z.infer<typeof ForEachContextSchema>;
export declare const BaseSerializedErrorSchema: z.ZodObject<{
    type: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type SerializedError = z.infer<typeof BaseSerializedErrorSchema>;
export declare const WhileContextSchema: z.ZodObject<{
    iteration: z.ZodNumber;
}, z.core.$strip>;
export type WhileContext = z.infer<typeof WhileContextSchema>;
export declare const StepContextSchema: z.ZodObject<{
    context: z.ZodOptional<z.ZodObject<{
        hitl: z.ZodOptional<z.ZodObject<{
            externalFormLink: z.ZodOptional<z.ZodString>;
            externalQueryLink: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    event: z.ZodOptional<z.ZodObject<{
        alerts: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            _id: z.ZodString;
            _index: z.ZodString;
            kibana: z.ZodObject<{
                alert: z.ZodUnknown;
            }, z.core.$strip>;
            '@timestamp': z.ZodString;
        }, z.core.$strip>, z.ZodUnknown]>>;
        rule: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            tags: z.ZodArray<z.ZodString>;
            consumer: z.ZodString;
            producer: z.ZodString;
            ruleTypeId: z.ZodString;
        }, z.core.$strip>;
        params: z.ZodUnknown;
        spaceId: z.ZodString;
    }, z.core.$strip>>;
    execution: z.ZodObject<{
        id: z.ZodString;
        isTestRun: z.ZodBoolean;
        startedAt: z.ZodDate;
        url: z.ZodString;
        executedBy: z.ZodOptional<z.ZodString>;
        effectiveIdentity: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"service_account">;
            id: z.ZodString;
        }, z.core.$strip>>;
        triggeredBy: z.ZodOptional<z.ZodString>;
        usage: z.ZodOptional<z.ZodObject<{
            inputTokens: z.ZodNumber;
            outputTokens: z.ZodNumber;
            cachedTokens: z.ZodOptional<z.ZodNumber>;
            totalTokens: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    workflow: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        enabled: z.ZodBoolean;
        spaceId: z.ZodString;
        version: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    kibanaUrl: z.ZodString;
    output: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodNumber>, z.ZodArray<z.ZodBoolean>]>]>>>;
    consts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    now: z.ZodOptional<z.ZodDate>;
    parent: z.ZodOptional<z.ZodObject<{
        workflowId: z.ZodString;
        executionId: z.ZodString;
        depth: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    steps: z.ZodRecord<z.ZodString, z.ZodObject<{
        output: z.ZodOptional<z.ZodAny>;
        error: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>>;
    foreach: z.ZodOptional<z.ZodObject<{
        items: z.ZodArray<z.ZodUnknown>;
        index: z.ZodNumber;
        item: z.ZodUnknown;
        total: z.ZodNumber;
    }, z.core.$strip>>;
    while: z.ZodOptional<z.ZodObject<{
        iteration: z.ZodNumber;
    }, z.core.$strip>>;
    variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    error: z.ZodOptional<z.ZodObject<{
        type: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type StepContext = z.infer<typeof StepContextSchema>;
export declare const DynamicStepContextSchema: z.ZodObject<{
    context: z.ZodOptional<z.ZodObject<{
        hitl: z.ZodOptional<z.ZodObject<{
            externalFormLink: z.ZodOptional<z.ZodString>;
            externalQueryLink: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    execution: z.ZodObject<{
        id: z.ZodString;
        isTestRun: z.ZodBoolean;
        startedAt: z.ZodDate;
        url: z.ZodString;
        executedBy: z.ZodOptional<z.ZodString>;
        effectiveIdentity: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"service_account">;
            id: z.ZodString;
        }, z.core.$strip>>;
        triggeredBy: z.ZodOptional<z.ZodString>;
        usage: z.ZodOptional<z.ZodObject<{
            inputTokens: z.ZodNumber;
            outputTokens: z.ZodNumber;
            cachedTokens: z.ZodOptional<z.ZodNumber>;
            totalTokens: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    workflow: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        enabled: z.ZodBoolean;
        spaceId: z.ZodString;
        version: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    kibanaUrl: z.ZodString;
    now: z.ZodOptional<z.ZodDate>;
    parent: z.ZodOptional<z.ZodObject<{
        workflowId: z.ZodString;
        executionId: z.ZodString;
        depth: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    inputs: z.ZodObject<{}, z.core.$strip>;
    output: z.ZodObject<{}, z.core.$strip>;
    consts: z.ZodObject<{}, z.core.$strip>;
    event: z.ZodOptional<z.ZodObject<{
        spaceId: z.ZodString;
    }, z.core.$strip>>;
    steps: z.ZodObject<{}, z.core.$strip>;
}, z.core.$strip>;
export type DynamicStepContext = z.infer<typeof DynamicStepContextSchema>;
