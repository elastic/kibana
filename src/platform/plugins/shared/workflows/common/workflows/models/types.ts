import {
  Workflow,
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from '@kbn/workflows';

// TODO: replace with a proper type
export interface UserDto {
  id: string;
  name: string;
  email: string;
}

export interface WorkflowTriggerDto {
  id: string;
  type: 'manual' | 'schedule';
}

export interface WorkflowExecutionChartItemDto {
  id: string;
  status: WorkflowExecutionStatus;
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
}

export function toWorkflowExecutionChartItemDto(
  execution: WorkflowExecution
): WorkflowExecutionChartItemDto {
  const { id, status, startedAt, finishedAt, duration } = execution;

  return {
    id,
    status,
    startedAt,
    finishedAt,
    duration,
  };
}

export interface WorkflowDetailDto {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTriggerDto[];
  tags: string[];
  enabled: boolean;
  runHistory: WorkflowExecutionChartItemDto[];
  definition: WorkflowDefinition;
  createdBy: UserDto;
  createdAt: string;
  updatedAt: string;
}

export function toWorkflowDetailDto(
  workflow: Workflow,
  executions: WorkflowExecution[]
): WorkflowDetailDto {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    triggers: workflow.triggers,
    tags: workflow.tags.map((tag) => tag.name),
    enabled: workflow.enabled,
    runHistory: executions.map(toWorkflowExecutionChartItemDto),
    definition: workflow.definition,
    createdBy: workflow.createdBy,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
  };
}

export type WorkflowListItemDto = Pick<
  WorkflowDetailDto,
  'id' | 'name' | 'description' | 'triggers' | 'tags' | 'enabled' | 'runHistory'
>;

export function toWorkflowListItemDto(
  workflow: Workflow,
  executions: WorkflowExecution[]
): WorkflowListItemDto {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    triggers: workflow.triggers,
    tags: workflow.tags.map((tag) => tag.name),
    enabled: workflow.enabled,
    runHistory: executions.map(toWorkflowExecutionChartItemDto),
  };
}

export interface WorkflowListDto {
  results: WorkflowListItemDto[];
  _pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}
