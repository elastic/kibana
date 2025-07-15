import { z } from 'zod';

/* -- Settings -- */
export const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).optional(),
  timeoutSeconds: z.number().int().min(1).optional(),
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
const BaseStepSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    type: z.discriminatedUnion('type', [
      ForEachStepSchema,
      IfStepSchema,
      AtomicStepSchema,
      ParallelStepSchema,
      MergeStepSchema,
      ConnectorStepSchema,
      // ...other step types
    ]),
    with: z.record(z.string(), z.any()).optional(),
    if: z.string().optional(),
    foreach: z.string().optional(),
    // next: z.string().optional(),
    onError: WorkflowOnFailureSchema.optional(),
    timeout: z.number().optional(),
  })
);

const ConnectorStepSchema = z.object({
  type: z.string(),
  name: z.string(),
  connectorId: z.optional(z.string()), // http.request for example, doesn't need connectorId
  // steps: z.array(BaseStepSchema), // TODO: do we need this?
});


const ForEachStepSchema = z.object({
  type: z.literal('forEach'),
  name: z.string(),
  foreach: z.string(),
  steps: z.array(BaseStepSchema),
});

const IfStepSchema = z.object({
  type: z.literal('if'),
  name: z.string(),
  condition: z.string(),
  steps: z.array(BaseStepSchema),
  else: z.array(BaseStepSchema).optional(),
});

const AtomicStepSchema = z.object({
  type: z.string(),
  name: z.string(),
  // ...other atomic fields
  steps: z.array(BaseStepSchema).optional(), // allow nesting even for atomic steps
});

const ParallelStepSchema = z.object({
  type: z.literal('parallel'),
  name: z.string(),
  branches: z.array(
    z.object({
      name: z.string(),
      steps: z.array(BaseStepSchema),
    })
  ),
});

const MergeStepSchema = z.object({
  type: z.literal('merge'),
  name: z.string(),
  sources: z.array(z.string()), // references to branches or steps to merge
  steps: z.array(BaseStepSchema), // steps to run after merge
});

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

/* --- Workflow --- */
export const WorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  settings: WorkflowSettingsSchema.optional(),
  enabled: z.boolean().default(true),
  triggers: z.array(TriggerSchema).min(1),
  inputs: z.array(WorkflowInputSchema).optional(),
  consts: WorkflowConstsSchema.optional(),
  steps: z.array(BaseStepSchema).min(1),
});

export type Workflow = z.infer<typeof WorkflowSchema>;
