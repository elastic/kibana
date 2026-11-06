/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

import { BaseEventSchema } from '../common/base_event';
import { JsonModelSchema } from '../common/json_model_schema';

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

export const LegacyWorkflowInputSchema = z.union([
  WorkflowInputStringSchema,
  WorkflowInputNumberSchema,
  WorkflowInputBooleanSchema,
  WorkflowInputChoiceSchema,
  WorkflowInputArraySchema,
]);
export type LegacyWorkflowInput = z.infer<typeof LegacyWorkflowInputSchema>;

export const WorkflowInputSchema = z.union([
  // New JSON Schema format
  JsonModelSchema,
  // TODO(https://github.com/elastic/security-team/issues/16526): Remove legacy array format once all workflows are migrated to JSON Schema inputs.
  // Legacy array format (for backward compatibility)
  z.array(LegacyWorkflowInputSchema),
]);
export type WorkflowInput = z.infer<typeof WorkflowInputSchema>;

export const ManualTriggerSchema = z.object({
  type: z.literal('manual'),
  inputs: WorkflowInputSchema.optional(),
});
export type ManualTrigger = z.infer<typeof ManualTriggerSchema>;

export const ManualTriggerEventSchema = BaseEventSchema.extend({
  inputs: z.unknown().optional(),
});
export type ManualTriggerEvent = z.infer<typeof ManualTriggerEventSchema>;

export const isManualTrigger = (trigger: { type?: string }): trigger is ManualTrigger =>
  trigger.type === 'manual';
