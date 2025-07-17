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
export const DetectionRuleTriggerSchema = z.object({
  type: z.literal('triggers.elastic.detectionRule'),
  with: z.union([
    z.object({ rule_id: z.string().min(1) }),
    z.object({ rule_name: z.string().min(1) }),
  ]),
});

export const ScheduledTriggerSchema = z.object({
  type: z.literal('triggers.elastic.scheduled'),
  with: z.union([
    z.object({
      every: z.string().min(1),
      unit: z.enum(['minute', 'hour', 'day', 'week', 'month', 'year']),
    }),
    z.object({ cron: z.string().min(1) }),
  ]),
});

export const ManualTriggerSchema = z.object({
  type: z.literal('triggers.elastic.manual'),
});

export const TriggerSchema = z.discriminatedUnion('type', [
  DetectionRuleTriggerSchema,
  ScheduledTriggerSchema,
  ManualTriggerSchema,
]);

/* --- Steps --- */
export const WorkflowRetrySchema = z.object({
  'max-attempts': z.number().min(1),
  delay: z.number().min(0),
});

export const WorkflowOnFailureSchema = z.object({
  retry: WorkflowRetrySchema,
  'fallback-step': z.string().min(1),
  continue: z.boolean().optional(),
});

// Base step schema, with recursive steps property
export const BaseStepSchema = z.object({
  name: z.string().min(1),
  if: z.string().optional(),
  foreach: z.string().optional(),
  // next: z.string().optional(),
  'on-failure': WorkflowOnFailureSchema.optional(),
  timeout: z.number().optional(),
});

export const BaseConnectorStepSchema = BaseStepSchema.extend({
  type: z.string().min(1),
  'connector-id': z.string().optional(), // http.request for example, doesn't need connectorId
  with: z.record(z.string(), z.any()).optional(),
});

export const ForEachStepSchema = BaseStepSchema.extend({
  type: z.literal('foreach'),
  foreach: z.string(),
  steps: z.array(BaseStepSchema).min(1),
});

export const getForEachStepSchema = (stepSchema: z.ZodType) => {
  return BaseStepSchema.extend({
    type: z.literal('foreach'),
    foreach: z.string(),
    steps: z.array(stepSchema).min(1),
  });
};

export const IfStepSchema = BaseStepSchema.extend({
  type: z.literal('if'),
  condition: z.string(),
  steps: z.array(BaseStepSchema),
  else: z.array(BaseStepSchema).optional(),
});

export const getIfStepSchema = (stepSchema: z.ZodType) => {
  return BaseStepSchema.extend({
    type: z.literal('if'),
    condition: z.string(),
    steps: z.array(stepSchema).min(1),
    else: z.array(stepSchema).optional(),
  });
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

export const getParallelStepSchema = (stepSchema: z.ZodType) => {
  return BaseStepSchema.extend({
    type: z.literal('parallel'),
    branches: z.array(z.object({ name: z.string(), steps: z.array(stepSchema) })),
  });
};

export const MergeStepSchema = BaseStepSchema.extend({
  type: z.literal('merge'),
  sources: z.array(z.string()), // references to branches or steps to merge
  steps: z.array(BaseStepSchema), // steps to run after merge
});

export const getMergeStepSchema = (stepSchema: z.ZodType) => {
  return BaseStepSchema.extend({
    type: z.literal('merge'),
    sources: z.array(z.string()), // references to branches or steps to merge
    steps: z.array(stepSchema), // steps to run after merge
  });
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
    ParallelStepSchema,
    MergeStepSchema,
    // ConnectorStepSchema,
  ])
);

/* --- Workflow --- */
export const WorkflowSchema = z.object({
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

export const WorkflowYamlSchema = z.object({
  version: z.literal('1').default('1').describe('The version of the workflow schema'),
  workflow: WorkflowSchema,
});

export type WorkflowYaml = z.infer<typeof WorkflowYamlSchema>;
