/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

/* -- Settings -- */
export const RetryPolicySchema = z.object({
  'max-attempts': z.number().int().min(1).optional(),
  'timeout-seconds': z.number().int().min(1).optional(),
});

export const TemplatingOptionsSchema = z.object({
  engine: z.enum(['mustache', 'nunjucks']),
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
  templating: TemplatingOptionsSchema.optional(),
  timezone: z.string().optional(), // Should follow IANA TZ format
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
  enabled: z.boolean().optional().default(true),
  with: z
    .union([z.object({ rule_id: z.string().min(1) }), z.object({ rule_name: z.string().min(1) })])
    .optional(),
});

export const ScheduledTriggerSchema = z.object({
  type: z.literal('scheduled'),
  enabled: z.boolean().optional().default(true),
  with: z.union([
    z.object({
      every: z.string().min(1),
      unit: z.enum(['second', 'minute', 'hour', 'day', 'week', 'month', 'year']),
    }),
    z.object({ cron: z.string().min(1) }),
  ]),
});

export const ManualTriggerSchema = z.object({
  type: z.literal('manual'),
  enabled: z.boolean().optional().default(true),
});

export const TriggerSchema = z.discriminatedUnion('type', [
  AlertRuleTriggerSchema,
  ScheduledTriggerSchema,
  ManualTriggerSchema,
]);

/* --- Steps --- */
const StepWithTimeoutSchema = z.object({
  timeout: z.number().optional(),
});
export type StepWithTimeout = z.infer<typeof StepWithTimeoutSchema>;

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
  .merge(StepWithTimeoutSchema)
  .merge(StepWithOnFailureSchema);
export type ConnectorStep = z.infer<typeof BaseConnectorStepSchema>;

export const WaitStepSchema = BaseStepSchema.extend({
  type: z.literal('wait'),
  with: z.object({
    duration: z.string().regex(/^\d+(ms|[smhdw])$/), // e.g., '5s', '1m', '2h'
  }),
});
export type WaitStep = z.infer<typeof WaitStepSchema>;

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
  }),
})
  .merge(StepWithIfConditionSchema)
  .merge(StepWithForEachSchema)
  .merge(StepWithTimeoutSchema)
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
export const WorkflowInputTypeEnum = z.enum(['string', 'number', 'boolean', 'choice']);

const WorkflowInputBaseSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  default: z.any().optional(),
  required: z.boolean().optional(),
});

const WorkflowInputStringSchema = WorkflowInputBaseSchema.extend({
  type: z.literal('string'),
  default: z.string().optional(),
});

const WorkflowInputNumberSchema = WorkflowInputBaseSchema.extend({
  type: z.literal('number'),
  default: z.number().optional(),
});

const WorkflowInputBooleanSchema = WorkflowInputBaseSchema.extend({
  type: z.literal('boolean'),
  default: z.boolean().optional(),
});

const WorkflowInputChoiceSchema = WorkflowInputBaseSchema.extend({
  type: z.literal('choice'),
  default: z.string().optional(),
  options: z.array(z.string()),
});

export const WorkflowInputSchema = z.discriminatedUnion('type', [
  WorkflowInputStringSchema,
  WorkflowInputNumberSchema,
  WorkflowInputBooleanSchema,
  WorkflowInputChoiceSchema,
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
  z.discriminatedUnion('type', [
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

export const WorkflowExecutionContextSchema = z.object({
  id: z.string(),
  isTestRun: z.boolean(),
  startedAt: z.date(),
});
export type WorkflowExecutionContext = z.infer<typeof WorkflowExecutionContextSchema>;

export const WorkflowDataContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  spaceId: z.string(),
});
export type WorkflowDataContext = z.infer<typeof WorkflowDataContextSchema>;

export const WorkflowContextSchema = z.object({
  event: z.any().optional(),
  inputs: z.any().optional(),
  execution: WorkflowExecutionContextSchema,
  workflow: WorkflowDataContextSchema,
  consts: z.record(z.string(), z.any()).optional(),
  now: z.date().optional(),
});

export type WorkflowContext = z.infer<typeof WorkflowContextSchema>;

export const StepContextSchema = WorkflowContextSchema.extend({
  steps: z.record(
    z.string(),
    z.object({
      output: z.any().optional(),
      error: z.any().optional(),
    })
  ),
  foreach: z
    .object({
      items: z.array(z.any()),
      index: z.number().int(),
      item: z.any(),
      total: z.number().int(),
    })
    .optional(),
});
export type StepContext = z.infer<typeof StepContextSchema>;
