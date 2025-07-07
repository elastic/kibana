export interface ProviderInput {
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: string | number | boolean;
}

export interface Provider {
  type: string;
  action: (
    stepInputs?: Record<string, any>,
    context?: Record<string, any>
  ) => Promise<Record<string, any> | void>;
  inputsDefinition: Record<string, ProviderInput>;
}

export interface WorkflowStep {
  id?: string;
  providerName: string;
  inputs: Record<string, any>;
  needs?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  steps: Record<string, WorkflowStep>;
}

export enum WorkflowRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface WorkflowStepExecution {
  id: string;
  stepId: string;
  workflowRunId: string;
  workflowId: string;
  status: WorkflowRunStatus;
  startedAt: Date;
  completedAt?: Date;
  executionTimeMs?: number;
  error?: string;
  output?: Record<string, any>;
}