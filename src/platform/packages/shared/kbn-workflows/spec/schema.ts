/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import { z } from '@kbn/zod';

export const DurationSchema = z.string().regex(/^\d+(ms|[smhdw])$/, 'Invalid duration format');

/* -- Settings -- */
export const RetryPolicySchema = z.object({
  'max-attempts': z.number().int().min(1).optional(),
  'timeout-seconds': z.number().int().min(1).optional(),
});

export const WorkflowRetrySchema = z.object({
  'max-attempts': z.number().min(1),
  delay: z
    .string()
    .regex(/^\d+(ms|[smhdw])$/, 'Invalid duration format')
    .optional(), // e.g., '5s', '1m', '2h' (default: no delay)
});
export type WorkflowRetry = z.infer<typeof WorkflowRetrySchema>;

// Base step schema, with recursive steps property
export const BaseStepSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
});
export type BaseStep = z.infer<typeof BaseStepSchema>;

export const WorkflowOnFailureSchema = z.object({
  retry: WorkflowRetrySchema.optional(),
  fallback: z.array(BaseStepSchema).min(1).optional(),
  continue: z.boolean().optional(),
});

export type WorkflowOnFailure = z.infer<typeof WorkflowOnFailureSchema>;

export function getOnFailureStepSchema(stepSchema: z.ZodType, loose: boolean = false) {
  const schema = WorkflowOnFailureSchema.extend({
    fallback: z.array(stepSchema).optional(),
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial();
  }

  return schema;
}

export const WorkflowSettingsSchema = z.object({
  'on-failure': WorkflowOnFailureSchema.optional(),
  timezone: z.string().optional(), // Should follow IANA TZ format
  timeout: DurationSchema.optional(), // e.g., '5s', '1m', '2h'
});
export type WorkflowSettings = z.infer<typeof WorkflowSettingsSchema>;

export function getWorkflowSettingsSchema(stepSchema: z.ZodType, loose: boolean = false) {
  const schema = WorkflowSettingsSchema.extend({
    'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial();
  }

  return schema;
}

/* --- Triggers --- */
export const AlertRuleTriggerSchema = z.object({
  type: z.literal('alert'),
  with: z
    .union([z.object({ rule_id: z.string().min(1) }), z.object({ rule_name: z.string().min(1) })])
    .optional(),
});

export const ScheduledTriggerSchema = z.object({
  type: z.literal('scheduled'),
  with: z.union([
    // New format: every: "5m", "2h", "1d", "30s"
    z.object({
      every: z
        .string()
        .regex(/^\d+[smhd]$/, 'Invalid interval format. Use format like "5m", "2h", "1d", "30s"'),
    }),
    z.object({
      rrule: z.object({
        freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
        interval: z.number().int().positive(),
        tzid: z.enum(moment.tz.names() as [string, ...string[]]).default('UTC'),
        dtstart: z.string().optional(),
        byhour: z.array(z.number().int().min(0).max(23)).optional(),
        byminute: z.array(z.number().int().min(0).max(59)).optional(),
        byweekday: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).optional(),
        bymonthday: z.array(z.number().int().min(1).max(31)).optional(),
      }),
    }),
  ]),
});

export const ManualTriggerSchema = z.object({
  type: z.literal('manual'),
});

export const TriggerSchema = z.discriminatedUnion('type', [
  AlertRuleTriggerSchema,
  ScheduledTriggerSchema,
  ManualTriggerSchema,
]);

export const TriggerTypes = [
  AlertRuleTriggerSchema.shape.type._def.value,
  ScheduledTriggerSchema.shape.type._def.value,
  ManualTriggerSchema.shape.type._def.value,
];
export type TriggerType = (typeof TriggerTypes)[number];

/* --- Steps --- */
export const TimeoutPropSchema = z.object({
  timeout: DurationSchema.optional(),
});
export type TimeoutProp = z.infer<typeof TimeoutPropSchema>;

const StepWithForEachSchema = z.object({
  foreach: z.string().optional(),
});
export type StepWithForeach = z.infer<typeof StepWithForEachSchema>;

export type StepWithOnFailure = z.infer<typeof StepWithOnFailureSchema>;

const StepWithIfConditionSchema = z.object({
  if: z.string().optional(),
});
export type StepWithIfCondition = z.infer<typeof StepWithIfConditionSchema>;

export const StepWithOnFailureSchema = z.object({
  'on-failure': WorkflowOnFailureSchema.optional(),
});

export const BaseConnectorStepSchema = BaseStepSchema.extend({
  type: z.string().min(1),
  'connector-id': z.string().optional(), // http.request for example, doesn't need connectorId
  with: z.record(z.string(), z.any()).optional(),
})
  .merge(StepWithIfConditionSchema)
  .merge(StepWithForEachSchema)
  .merge(TimeoutPropSchema)
  .merge(StepWithOnFailureSchema);
export type ConnectorStep = z.infer<typeof BaseConnectorStepSchema>;

export const WaitStepSchema = BaseStepSchema.extend({
  type: z.literal('wait'),
  with: z.object({
    duration: DurationSchema, // e.g., '5s', '1m', '2h'
  }),
});
export type WaitStep = z.infer<typeof WaitStepSchema>;

// Fetcher configuration for HTTP request customization (shared across formats)
export const FetcherConfigSchema = z
  .object({
    skip_ssl_verification: z.boolean().optional(),
    follow_redirects: z.boolean().optional(),
    max_redirects: z.number().optional(),
    keep_alive: z.boolean().optional(),
  })
  .optional();

export const HttpStepSchema = BaseStepSchema.extend({
  type: z.literal('http'),
  with: z.object({
    url: z.string().min(1),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional().default('GET'),
    headers: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional()
      .default({}),
    body: z.any().optional(),
    timeout: z.string().optional().default('30s'),
    fetcher: FetcherConfigSchema,
  }),
})
  .merge(StepWithIfConditionSchema)
  .merge(StepWithForEachSchema)
  .merge(TimeoutPropSchema)
  .merge(StepWithOnFailureSchema);
export type HttpStep = z.infer<typeof HttpStepSchema>;

// Generic Elasticsearch step schema for backend validation
export const ElasticsearchStepSchema = BaseStepSchema.extend({
  type: z.string().refine((val) => val.startsWith('elasticsearch.'), {
    message: 'Elasticsearch step type must start with "elasticsearch."',
  }),
  with: z.union([
    // Raw API format - like Dev Console
    z.object({
      request: z.object({
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']).optional().default('GET'),
        path: z.string().min(1),
        body: z.any().optional(),
      }),
    }),
    // Sugar syntax for common operations
    z
      .object({
        index: z.string().optional(),
        id: z.string().optional(),
        query: z.record(z.string(), z.any()).optional(),
        body: z.record(z.string(), z.any()).optional(),
        size: z.number().optional(),
        from: z.number().optional(),
        sort: z.array(z.any()).optional(),
        _source: z.union([z.boolean(), z.array(z.string()), z.string()]).optional(),
        aggs: z.record(z.string(), z.any()).optional(),
        aggregations: z.record(z.string(), z.any()).optional(),
      })
      .and(z.record(z.string(), z.any())), // Allow additional properties for flexibility
  ]),
});
export type ElasticsearchStep = z.infer<typeof ElasticsearchStepSchema>;

// Generic Kibana step schema for backend validation
export const KibanaStepSchema = BaseStepSchema.extend({
  type: z.string().refine((val) => val.startsWith('kibana.'), {
    message: 'Kibana step type must start with "kibana."',
  }),
  with: z.union([
    // Raw API format - direct HTTP API calls
    z.object({
      request: z.object({
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']).optional().default('GET'),
        path: z.string().min(1),
        body: z.any().optional(),
        headers: z.record(z.string(), z.string()).optional(),
      }),
      fetcher: FetcherConfigSchema,
    }),
    // Sugar syntax for common Kibana operations
    z
      .object({
        // Cases API
        title: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        assignees: z.array(z.string()).optional(),
        owner: z.string().optional(),
        connector: z.record(z.string(), z.any()).optional(),
        settings: z.record(z.string(), z.any()).optional(),
        // Generic parameters
        id: z.string().optional(),
        case_id: z.string().optional(),
        space_id: z.string().optional(),
        page: z.number().optional(),
        perPage: z.number().optional(),
        status: z.string().optional(),
        fetcher: FetcherConfigSchema,
      })
      .and(z.record(z.string(), z.any())), // Allow additional properties for flexibility
  ]),
});
export type KibanaStep = z.infer<typeof KibanaStepSchema>;

export function getHttpStepSchema(stepSchema: z.ZodType, loose: boolean = false) {
  const schema = HttpStepSchema.extend({
    'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial().required({ type: true });
  }

  return schema;
}

export const ForEachStepSchema = BaseStepSchema.extend({
  type: z.literal('foreach'),
  foreach: z.string(),
  steps: z.array(BaseStepSchema).min(1),
}).merge(StepWithIfConditionSchema);
export type ForEachStep = z.infer<typeof ForEachStepSchema>;

export const getForEachStepSchema = (stepSchema: z.ZodType, loose: boolean = false) => {
  const schema = ForEachStepSchema.extend({
    steps: z.array(stepSchema).min(1),
    'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial().required({ type: true });
  }

  return schema;
};

export const IfStepSchema = BaseStepSchema.extend({
  type: z.literal('if'),
  condition: z.string(),
  steps: z.array(BaseStepSchema).min(1),
  else: z.array(BaseStepSchema).optional(),
});
export type IfStep = z.infer<typeof IfStepSchema>;

export const getIfStepSchema = (stepSchema: z.ZodType, loose: boolean = false) => {
  const schema = IfStepSchema.extend({
    steps: z.array(stepSchema).min(1),
    else: z.array(stepSchema).optional(),
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial().required({ type: true });
  }

  return schema;
};

export const ParallelStepSchema = BaseStepSchema.extend({
  type: z.literal('parallel'),
  branches: z.array(
    z.object({
      name: z.string(),
      steps: z.array(BaseStepSchema),
    })
  ),
});
export type ParallelStep = z.infer<typeof ParallelStepSchema>;

export const getParallelStepSchema = (stepSchema: z.ZodType, loose: boolean = false) => {
  const schema = ParallelStepSchema.extend({
    branches: z.array(z.object({ name: z.string(), steps: z.array(stepSchema) })),
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial().required({ type: true });
  }

  return schema;
};

export const MergeStepSchema = BaseStepSchema.extend({
  type: z.literal('merge'),
  sources: z.array(z.string()), // references to branches or steps to merge
  steps: z.array(BaseStepSchema), // steps to run after merge
});
export type MergeStep = z.infer<typeof MergeStepSchema>;

export const getMergeStepSchema = (stepSchema: z.ZodType, loose: boolean = false) => {
  const schema = MergeStepSchema.extend({
    steps: z.array(stepSchema), // steps to run after merge
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial().required({ type: true });
  }

  return schema;
};

/* --- Inputs --- */
export const WorkflowInputTypeEnum = z.enum(['string', 'number', 'boolean', 'choice', 'array']);

const WorkflowInputBaseSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  default: z.any().optional(),
  required: z.boolean().optional(),
});

export const WorkflowInputStringSchema = WorkflowInputBaseSchema.extend({
  type: z.literal('string'),
  default: z.string().optional(),
});

export const WorkflowInputNumberSchema = WorkflowInputBaseSchema.extend({
  type: z.literal('number'),
  default: z.number().optional(),
});

export const WorkflowInputBooleanSchema = WorkflowInputBaseSchema.extend({
  type: z.literal('boolean'),
  default: z.boolean().optional(),
});

export const WorkflowInputChoiceSchema = WorkflowInputBaseSchema.extend({
  type: z.literal('choice'),
  default: z.string().optional(),
  options: z.array(z.string()),
});

export const WorkflowInputArraySchema = WorkflowInputBaseSchema.extend({
  type: z.literal('array'),
  minItems: z.number().int().nonnegative().optional(),
  maxItems: z.number().int().nonnegative().optional(),
  default: z.union([z.array(z.string()), z.array(z.number()), z.array(z.boolean())]).optional(),
});

export const WorkflowInputSchema = z.union([
  WorkflowInputStringSchema,
  WorkflowInputNumberSchema,
  WorkflowInputBooleanSchema,
  WorkflowInputChoiceSchema,
  WorkflowInputArraySchema,
]);

/* --- Consts --- */
export const WorkflowConstsSchema = z.record(
  z.string(),
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.string(), z.any()),
    z.object({}),
    z.array(z.any()),
  ])
);

const StepSchema = z.lazy(() =>
  z.union([
    ForEachStepSchema,
    IfStepSchema,
    WaitStepSchema,
    HttpStepSchema,
    ElasticsearchStepSchema,
    KibanaStepSchema,
    ParallelStepSchema,
    MergeStepSchema,
    BaseConnectorStepSchema,
  ])
);
export type Step = z.infer<typeof StepSchema>;

export const BuiltInStepTypes = [
  ForEachStepSchema.shape.type._def.value,
  IfStepSchema.shape.type._def.value,
  ParallelStepSchema.shape.type._def.value,
  MergeStepSchema.shape.type._def.value,
  WaitStepSchema.shape.type._def.value,
  HttpStepSchema.shape.type._def.value,
];
export type BuiltInStepType = (typeof BuiltInStepTypes)[number];

/* --- Workflow --- */
export const WorkflowSchema = z.object({
  version: z.literal('1').default('1').describe('The version of the workflow schema'),
  name: z.string().min(1),
  description: z.string().optional(),
  settings: WorkflowSettingsSchema.optional(),
  enabled: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  triggers: z.array(TriggerSchema).min(1),
  inputs: z.array(WorkflowInputSchema).optional(),
  consts: WorkflowConstsSchema.optional(),
  steps: z.array(StepSchema).min(1),
});

export type WorkflowYaml = z.infer<typeof WorkflowSchema>;

// Schema is required for autocomplete because WorkflowGraph and WorkflowDefinition use it to build the autocomplete context.
// The schema captures all possible fields and passes them through for consumption by WorkflowGraph.
export const WorkflowSchemaForAutocomplete = WorkflowSchema.partial()
  .extend({
    triggers: z
      .array(z.object({ type: z.string().catch('') }).passthrough())
      .catch([])
      .default([]),
    steps: z
      .array(
        z
          .object({
            type: z.string().catch(''),
            name: z.string().catch(''),
          })
          .passthrough()
      )
      .catch([])
      .default([]),
  })
  .passthrough();

export const WorkflowExecutionContextSchema = z.object({
  id: z.string(),
  isTestRun: z.boolean(),
  startedAt: z.date(),
  url: z.string(),
});
export type WorkflowExecutionContext = z.infer<typeof WorkflowExecutionContextSchema>;

export const WorkflowDataContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  spaceId: z.string(),
});
export type WorkflowDataContext = z.infer<typeof WorkflowDataContextSchema>;

// TODO: import AlertSchema from from '@kbn/alerts-as-data-utils' once it exported, now only type is exported
const AlertSchema = z.object({
  _id: z.string(),
  _index: z.string(),
  kibana: z.object({
    alert: z.any(),
  }),
  '@timestamp': z.string(),
});

const RuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()),
  consumer: z.string(),
  producer: z.string(),
  ruleTypeId: z.string(),
});

export const EventSchema = z.object({
  alerts: z.array(z.union([AlertSchema, z.any()])),
  rule: RuleSchema,
  spaceId: z.string(),
  params: z.any(),
});

export const WorkflowContextSchema = z.object({
  event: EventSchema.optional(),
  execution: WorkflowExecutionContextSchema,
  workflow: WorkflowDataContextSchema,
  kibanaUrl: z.string(),
  inputs: z
    .record(
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.union([z.array(z.string()), z.array(z.number()), z.array(z.boolean())]),
      ])
    )
    .optional(),
  consts: z.record(z.string(), z.any()).optional(),
  now: z.date().optional(),
});
export type WorkflowContext = z.infer<typeof WorkflowContextSchema>;

export const DynamicWorkflowContextSchema = WorkflowContextSchema.extend({
  // overriding record with object to avoid type mismatch when
  // extending with actual inputs and consts of different types
  inputs: z.object({}),
  consts: z.object({}),
});
export type DynamicWorkflowContext = z.infer<typeof DynamicWorkflowContextSchema>;

export const StepDataSchema = z.object({
  output: z.any().optional(),
  error: z.any().optional(),
});
export type StepData = z.infer<typeof StepDataSchema>;

const ForEachContextItemSchema = z.unknown();
export const ForEachContextSchema = z.object({
  items: z.array(ForEachContextItemSchema),
  index: z.number().int(),
  item: ForEachContextItemSchema,
  total: z.number().int(),
});
export type ForEachContext = z.infer<typeof ForEachContextSchema>;

export const StepContextSchema = WorkflowContextSchema.extend({
  steps: z.record(z.string(), StepDataSchema),
  foreach: ForEachContextSchema.optional(),
});
export type StepContext = z.infer<typeof StepContextSchema>;

export const DynamicStepContextSchema = DynamicWorkflowContextSchema.extend({
  // overriding record with object to avoid type mismatch when
  // extending with actual step ids and different output types
  steps: z.object({}),
});
export type DynamicStepContext = z.infer<typeof DynamicStepContextSchema>;

export const ExecutionErrorSchema = z.object({
  type: z.string(),
  message: z.string(),
  details: z.any().optional(),
});
export type ExecutionError = z.infer<typeof ExecutionErrorSchema>;

export const HttpStepErrorSchema = ExecutionErrorSchema.extend({
  details: z.object({
    statusCode: z.number().optional(),
    statusText: z.string().optional(),
    responseBody: z.any().optional(),
  }),
});
export type HttpStepError = z.infer<typeof HttpStepErrorSchema>;
