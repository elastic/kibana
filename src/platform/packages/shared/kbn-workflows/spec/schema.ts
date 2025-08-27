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

export const WorkflowSettingsSchema = z.object({
  retry: RetryPolicySchema.optional(),
  templating: TemplatingOptionsSchema.optional(),
  timezone: z.string().optional(), // Should follow IANA TZ format
});

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
export const WorkflowRetrySchema = z.object({
  'max-attempts': z.number().min(1),
  delay: z
    .string()
    .regex(/^\d+(ms|[smhdw])$/, 'Invalid duration format')
    .optional(), // e.g., '5s', '1m', '2h' (default: no delay)
});
export type WorkflowRetry = z.infer<typeof WorkflowRetrySchema>;

export const WorkflowOnFailureSchema = z.object({
  retry: WorkflowRetrySchema,
  'fallback-step': z.string().min(1).optional(),
  continue: z.boolean().optional(),
});
export type WorkflowOnFailure = z.infer<typeof WorkflowOnFailureSchema>;

// Base step schema, with recursive steps property
export const BaseStepSchema = z.object({
  name: z.string().min(1),
  if: z.string().optional(),
  foreach: z.string().optional(),
  'on-failure': WorkflowOnFailureSchema.optional(),
  timeout: z.number().optional(),
});
export type BaseStep = z.infer<typeof BaseStepSchema>;

export const BaseConnectorStepSchema = BaseStepSchema.extend({
  type: z.string().min(1),
  'connector-id': z.string().optional(), // http.request for example, doesn't need connectorId
  with: z.record(z.string(), z.any()).optional(),
});
export type ConnectorStep = z.infer<typeof BaseConnectorStepSchema>;

export const WaitStepSchema = BaseStepSchema.extend({
  type: z.literal('wait'),
  with: z.object({
    duration: z.string().regex(/^\d+(ms|[smhdw])$/), // e.g., '5s', '1m', '2h'
  }),
});
export type WaitStep = z.infer<typeof WaitStepSchema>;

export const ForEachStepSchema = BaseStepSchema.extend({
  type: z.literal('foreach'),
  foreach: z.string(),
  steps: z.array(BaseStepSchema).min(1),
});
export type ForEachStep = z.infer<typeof ForEachStepSchema>;

export const getForEachStepSchema = (stepSchema: z.ZodType, loose: boolean = false) => {
  const schema = BaseStepSchema.extend({
    type: z.literal('foreach'),
    foreach: z.string(),
    steps: z.array(stepSchema).min(1),
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
  steps: z.array(BaseStepSchema),
  else: z.array(BaseStepSchema).optional(),
});
export type IfStep = z.infer<typeof IfStepSchema>;

export const getIfStepSchema = (stepSchema: z.ZodType, loose: boolean = false) => {
  const schema = BaseStepSchema.extend({
    type: z.literal('if'),
    condition: z.string(),
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
  const schema = BaseStepSchema.extend({
    type: z.literal('parallel'),
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
  const schema = BaseStepSchema.extend({
    type: z.literal('merge'),
    sources: z.array(z.string()), // references to branches or steps to merge
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
