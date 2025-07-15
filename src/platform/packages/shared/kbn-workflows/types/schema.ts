import { z } from '@kbn/zod';
import { WorkflowStatus } from './v1';

export const WorkflowTriggerSchema = z.object({
  id: z.string(),
  type: z.string(),
  enabled: z.boolean(),
  config: z.record(z.string(), z.any()),
});

export const WorkflowStepSchema = z.object({
  id: z.string(),
  connectorType: z.string(),
  connectorName: z.string(),
  inputs: z.record(z.string(), z.any()),
  needs: z.array(z.string()).optional(),
});

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.nativeEnum(WorkflowStatus),
  triggers: z.array(WorkflowTriggerSchema),
  steps: z.array(WorkflowStepSchema),
});

export const CreateWorkflowRequestSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  status: z.nativeEnum(WorkflowStatus).optional(),
  triggers: z.array(WorkflowTriggerSchema).optional(),
  steps: z.array(WorkflowStepSchema).optional(),
});
