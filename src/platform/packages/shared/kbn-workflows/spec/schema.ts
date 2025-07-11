import { z } from 'zod';

/* --- Triggers --- */
export const DetectionRuleTriggerSchema = z.object({
  type: z.literal('triggers.elastic.detectionRule'),
  with: z.union([
    z.object({
      rule_id: z.string().min(1),
    }),
    z.object({
      rule_name: z.string().min(1),
    }),
  ]),
});

export const ScheduledTriggerSchema = z.object({
  type: z.literal('triggers.elastic.scheduled'),
  with: z.union([
    z.object({
      every: z.string().min(1),
      unit: z.enum(['minute', 'hour', 'day', 'week', 'month', 'year']),
    }),
    z.object({
      cron: z.string().min(1),
    }),
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

export const AbstractStepSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  with: z.record(z.string(), z.any()),
  if: z.string().optional(),
  foreach: z.string().optional(),
  next: z.string().optional(), // default behavior is to continue to the next step
  'on-failure': WorkflowOnFailureSchema,
  timeout: z.number().optional(), // max time to run the step in seconds
});

/* --- Example steps, will be generated from connectors --- */
export const SlackSendMessageStepSchema = AbstractStepSchema.extend({
  type: z.literal('slack.sendMessage'),
  with: z.union([
    z.object({
      message: z.string().min(1),
      username: z.string().min(1),
    }),
    z.object({
      message: z.string().min(1),
      channel: z.string().min(1),
    }),
  ]),
});

export const HttpGetStepSchema = AbstractStepSchema.extend({
  type: z.literal('http.get'),
  with: z.object({
    url: z.string().min(1),
    headers: z.record(z.string(), z.string()).optional(),
  }),
});

/* --- Flow steps --- */
export const SwitchStepSchema = AbstractStepSchema.extend({
  type: z.literal('flow.switch'),
  with: z.object({
    cases: z.array(
      z.object({
        condition: z.string().min(1),
        next: z.string(),
      })
    ),
    default: z.string().optional(),
  }),
});

export const StepSchema = z.discriminatedUnion('type', [AbstractStepSchema, SwitchStepSchema]);

/* --- Inputs --- */
export const WorkflowInputTypeEnum = z.enum(['string', 'number', 'boolean', 'choice']);

const WorkflowInputBaseSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  default: z.any().optional(),
  required: z.boolean().optional(),
  // do we need 'visually-required' ?
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
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  triggers: z.array(TriggerSchema).min(1),
  inputs: z.array(WorkflowInputSchema).optional(),
  consts: WorkflowConstsSchema.optional(),
  steps: z.array(StepSchema).min(1),
});

export type Workflow = z.infer<typeof WorkflowSchema>;
